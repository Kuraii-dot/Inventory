import crypto from 'crypto';
import pool from '../db/pool.js';

const clean = value => typeof value === 'string' ? value.trim() : '';
const nullable = value => clean(value) || null;
const today = () => new Date().toISOString().slice(0, 10);
const conditions = new Set(['new', 'good', 'fair', 'poor', 'damaged']);
const serverError = (res, err) => {
  console.error('Personnel assets error:', err);
  return res.status(500).json({ message: 'Database error: ' + err.message });
};

async function refreshMaintenanceState(db, assetId, conditionAfter = null) {
  await db.query(`UPDATE serialized_assets sa SET
    current_condition=COALESCE($1,sa.current_condition),
    status=CASE
      WHEN sa.status='phased_out' THEN 'phased_out'
      WHEN EXISTS (SELECT 1 FROM asset_maintenance am WHERE am.asset_id=sa.id AND am.is_voided=FALSE AND am.maintenance_status IN ('reported','scheduled','in_progress')) THEN 'under_maintenance'
      WHEN EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id=sa.id AND aa.status='active') THEN 'assigned'
      ELSE 'returned'
    END,
    updated_at=NOW()
    WHERE sa.id=$2`, [nullable(conditionAfter),assetId]);
}

export async function listPersonnel(req, res) {
  const search = clean(req.query.search);
  try {
    const result = await pool.query(`SELECT p.*,
      COUNT(a.id) FILTER (WHERE a.status='active')::int AS assigned_item_count
      FROM personnel p LEFT JOIN asset_assignments a ON a.personnel_id=p.id
      WHERE p.is_archived=FALSE AND ($1='' OR p.full_name ILIKE $2 OR p.employee_id ILIKE $2 OR p.department ILIKE $2)
      GROUP BY p.id ORDER BY p.full_name`, [search, `%${search}%`]);
    res.json(result.rows);
  } catch (err) { serverError(res, err); }
}

export async function createPersonnel(req, res) {
  const b = req.body;
  if (!clean(b.employee_id) || !clean(b.full_name)) return res.status(400).json({ message: 'Employee ID and full name are required.' });
  const status = ['active', 'inactive', 'separated'].includes(b.employment_status) ? b.employment_status : 'active';
  try {
    const result = await pool.query(`INSERT INTO personnel
      (employee_id,full_name,position,department,email,contact_number,employment_status,notes,profile_photo,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [clean(b.employee_id),clean(b.full_name),nullable(b.position),nullable(b.department),nullable(b.email),nullable(b.contact_number),status,nullable(b.notes),nullable(b.profile_photo),req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That employee ID is already in use.' });
    serverError(res, err);
  }
}

export async function updatePersonnel(req, res) {
  const b = req.body;
  if (!clean(b.employee_id) || !clean(b.full_name)) return res.status(400).json({ message: 'Employee ID and full name are required.' });
  const status = ['active', 'inactive', 'separated'].includes(b.employment_status) ? b.employment_status : 'active';
  try {
    const result = await pool.query(`UPDATE personnel SET employee_id=$1,full_name=$2,position=$3,department=$4,email=$5,
      contact_number=$6,employment_status=$7,notes=$8,profile_photo=$9,updated_at=NOW()
      WHERE id=$10 AND is_archived=FALSE RETURNING *`,
      [clean(b.employee_id),clean(b.full_name),nullable(b.position),nullable(b.department),nullable(b.email),nullable(b.contact_number),status,nullable(b.notes),nullable(b.profile_photo),req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Personnel record not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That employee ID is already in use.' });
    serverError(res, err);
  }
}

export async function archivePersonnel(req, res) {
  try {
    const active = await pool.query("SELECT COUNT(*)::int AS count FROM asset_assignments WHERE personnel_id=$1 AND status='active'", [req.params.id]);
    if (active.rows[0].count) return res.status(409).json({ message: 'Return or transfer all assigned items before archiving this person.' });
    const result = await pool.query('UPDATE personnel SET is_archived=TRUE,updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Personnel record not found.' });
    res.json({ message: 'Personnel record archived. Its history was preserved.' });
  } catch (err) { serverError(res, err); }
}

export async function listAssignableInventory(_req, res) {
  try {
    const result = await pool.query(`SELECT 'inventory' AS source_type,i.id AS source_id,i.id,i.name,
      GREATEST(i.quantity-COALESCE(r.returned_count,0),0) AS quantity,i.unit_price,i.unit,i.date_ordered,i.date_procured,i.sku,
      s.name AS supplier,c.name AS category,NULL::varchar AS asset_code FROM items i
      LEFT JOIN suppliers s ON s.id=i.supplier_id LEFT JOIN categories c ON c.id=i.category_id
      LEFT JOIN (SELECT inventory_item_id,COUNT(*)::int AS returned_count FROM serialized_assets WHERE status='returned' GROUP BY inventory_item_id) r ON r.inventory_item_id=i.id
      WHERE i.is_active=TRUE AND i.quantity-COALESCE(r.returned_count,0)>0
      UNION ALL
      SELECT 'serialized' AS source_type,sa.id AS source_id,i.id,i.name,1 AS quantity,sa.unit_price,i.unit,
        sa.date_ordered,sa.date_procured,i.sku,COALESCE(sa.procured_at,s.name) AS supplier,c.name AS category,sa.asset_code
      FROM serialized_assets sa JOIN items i ON i.id=sa.inventory_item_id
      LEFT JOIN suppliers s ON s.id=i.supplier_id LEFT JOIN categories c ON c.id=i.category_id
      WHERE sa.status='returned' AND i.is_active=TRUE ORDER BY name,date_procured DESC`);
    res.json(result.rows);
  } catch (err) { serverError(res, err); }
}

export async function assignAsset(req, res) {
  const b = req.body;
  if (!b.inventory_item_id || !b.personnel_id || !clean(b.asset_code) || !clean(b.item_type)) return res.status(400).json({ message: 'Inventory item, personnel, item code, and item type are required.' });
  const quantity = b.serialized_asset_id ? 1 : Number.parseInt(b.quantity, 10) || 1;
  if (quantity < 1 || quantity > 100) return res.status(400).json({ message: 'Quantity must be between 1 and 100.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const stock = await client.query('SELECT id,quantity FROM items WHERE id=$1 AND is_active=TRUE FOR UPDATE', [b.inventory_item_id]);
    if (!stock.rows[0] || Number(stock.rows[0].quantity)<quantity) throw Object.assign(new Error(`Only ${stock.rows[0]?.quantity || 0} unit(s) are currently available.`), { status: 409 });
    const person = await client.query('SELECT id FROM personnel WHERE id=$1 AND is_archived=FALSE', [b.personnel_id]);
    if (!person.rows[0]) throw Object.assign(new Error('Personnel record not found.'), { status: 404 });
    const condition = conditions.has(b.condition) ? b.condition : 'good';
    let assets = [];
    if (b.serialized_asset_id) {
      const asset = await client.query(`UPDATE serialized_assets SET status='assigned',current_condition=$1,notes=COALESCE($2,notes),updated_at=NOW()
        WHERE id=$3 AND inventory_item_id=$4 AND status='returned' RETURNING *`, [condition,nullable(b.notes),b.serialized_asset_id,b.inventory_item_id]);
      if (!asset.rows[0]) throw Object.assign(new Error('That returned asset is no longer available.'), { status:409 });
      assets = asset.rows;
    } else {
      for (let index = 0; index < quantity; index += 1) {
        const code = quantity === 1 ? clean(b.asset_code) : `${clean(b.asset_code)}-${String(index + 1).padStart(3, '0')}`;
        const asset = await client.query(`INSERT INTO serialized_assets
          (inventory_item_id,asset_code,qr_token,item_type,unit_price,procured_at,date_ordered,date_procured,current_condition,status,notes,created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'assigned',$10,$11) RETURNING *`,
          [b.inventory_item_id,code,crypto.randomBytes(24).toString('hex'),clean(b.item_type),Number(b.unit_price)||0,nullable(b.procured_at),b.date_ordered||null,b.date_procured||null,condition,nullable(b.notes),req.user.id]);
        assets.push(asset.rows[0]);
      }
    }
    for (const asset of assets) {
      await client.query(`INSERT INTO asset_assignments (asset_id,personnel_id,assigned_at,condition_on_assignment,notes,assigned_by)
        VALUES ($1,$2,$3,$4,$5,$6)`, [asset.id,b.personnel_id,b.assigned_at||today(),condition,nullable(b.notes),req.user.id]);
    }
    await client.query('UPDATE items SET quantity=quantity-$1 WHERE id=$2', [quantity,b.inventory_item_id]);
    await client.query('COMMIT');
    res.status(201).json({ message: `${quantity} item${quantity === 1 ? '' : 's'} assigned successfully.`, assets });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code==='23505') return res.status(409).json({ message: 'That item code already exists.' });
    if (err.status) return res.status(err.status).json({ message: err.message });
    serverError(res, err);
  } finally { client.release(); }
}

export async function getPersonnelAssets(req, res) {
  try {
    const result = await pool.query(`SELECT sa.*,aa.id AS assignment_id,aa.assigned_at,aa.notes AS assignment_notes,
      i.name AS inventory_name,p.full_name AS personnel_name,
      (SELECT MAX(am.date_reported) FROM asset_maintenance am WHERE am.asset_id=sa.id) AS last_maintenance_date
      FROM asset_assignments aa JOIN serialized_assets sa ON sa.id=aa.asset_id
      JOIN items i ON i.id=sa.inventory_item_id JOIN personnel p ON p.id=aa.personnel_id
      WHERE aa.personnel_id=$1 AND aa.status='active' ORDER BY aa.assigned_at DESC,sa.asset_code`, [req.params.id]);
    res.json(result.rows);
  } catch (err) { serverError(res, err); }
}

export async function getAssetDetails(req, res) {
  try {
    const asset = await pool.query(`SELECT sa.*,i.name AS inventory_name,i.unit,c.name AS category,s.name AS supplier,
      aa.id AS assignment_id,aa.assigned_at,aa.personnel_id,p.full_name AS personnel_name,p.employee_id,p.department
      FROM serialized_assets sa JOIN items i ON i.id=sa.inventory_item_id
      LEFT JOIN categories c ON c.id=i.category_id LEFT JOIN suppliers s ON s.id=i.supplier_id
      LEFT JOIN asset_assignments aa ON aa.asset_id=sa.id AND aa.status='active'
      LEFT JOIN personnel p ON p.id=aa.personnel_id WHERE sa.id=$1`, [req.params.id]);
    if (!asset.rows[0]) return res.status(404).json({ message: 'Asset not found.' });
    const [maintenance, assignments, phaseOuts] = await Promise.all([
      pool.query('SELECT * FROM asset_maintenance WHERE asset_id=$1 AND is_voided=FALSE ORDER BY date_reported DESC,id DESC', [req.params.id]),
      pool.query(`SELECT aa.*,p.full_name,p.employee_id FROM asset_assignments aa JOIN personnel p ON p.id=aa.personnel_id WHERE aa.asset_id=$1 ORDER BY aa.created_at DESC`, [req.params.id]),
      pool.query('SELECT * FROM asset_phase_outs WHERE asset_id=$1 ORDER BY phase_out_date DESC', [req.params.id]),
    ]);
    const maintenanceSummary = maintenance.rows.reduce((summary, record) => {
      if (record.maintenance_status !== 'completed') return summary;
      summary.parts_cost += Number(record.parts_cost || 0);
      summary.service_cost += Number(record.service_cost || 0);
      summary.total_cost += Number(record.parts_cost || 0) + Number(record.service_cost || 0);
      summary.record_count += 1;
      return summary;
    }, { parts_cost: 0, service_cost: 0, total_cost: 0, record_count: 0 });
    res.json({
      ...asset.rows[0],
      maintenance:maintenance.rows,
      maintenance_summary:maintenanceSummary,
      total_recorded_cost:Number(asset.rows[0].unit_price || 0) + maintenanceSummary.total_cost,
      assignment_history:assignments.rows,
      phase_out_history:phaseOuts.rows,
    });
  } catch (err) { serverError(res, err); }
}

export async function addMaintenance(req, res) {
  const b = req.body;
  if (!clean(b.reason) || !clean(b.work_performed)) return res.status(400).json({ message: 'Reason and work performed are required.' });
  const status = ['reported','scheduled','in_progress','completed','cancelled'].includes(b.maintenance_status) ? b.maintenance_status : 'completed';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO asset_maintenance
      (asset_id,date_reported,reason,diagnosis,work_performed,parts_added,service_provider,parts_cost,service_cost,condition_after,maintenance_status,completion_date,notes,recorded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.params.id,b.date_reported||today(),clean(b.reason),nullable(b.diagnosis),clean(b.work_performed),nullable(b.parts_added),nullable(b.service_provider),Number(b.parts_cost)||0,Number(b.service_cost)||0,nullable(b.condition_after),status,b.completion_date||null,nullable(b.notes),req.user.id]);
    await refreshMaintenanceState(client,req.params.id,b.condition_after);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Maintenance record saved.', maintenance:result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); serverError(res, err); } finally { client.release(); }
}

export async function updateMaintenance(req, res) {
  const b = req.body;
  if (!clean(b.reason) || !clean(b.work_performed)) return res.status(400).json({ message: 'Reason and work performed are required.' });
  const status = ['reported','scheduled','in_progress','completed','cancelled'].includes(b.maintenance_status) ? b.maintenance_status : 'completed';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE asset_maintenance SET date_reported=$1,reason=$2,diagnosis=$3,
      work_performed=$4,parts_added=$5,service_provider=$6,parts_cost=$7,service_cost=$8,
      condition_after=$9,maintenance_status=$10,completion_date=$11,notes=$12,updated_at=NOW()
      WHERE id=$13 AND asset_id=$14 AND is_voided=FALSE RETURNING *`,
      [b.date_reported||today(),clean(b.reason),nullable(b.diagnosis),clean(b.work_performed),nullable(b.parts_added),nullable(b.service_provider),Number(b.parts_cost)||0,Number(b.service_cost)||0,nullable(b.condition_after),status,b.completion_date||null,nullable(b.notes),req.params.maintenanceId,req.params.id]);
    if (!result.rows[0]) throw Object.assign(new Error('Maintenance record not found.'), { status:404 });
    await refreshMaintenanceState(client,req.params.id,b.condition_after);
    await client.query('COMMIT');
    res.json({ message:'Maintenance record updated.', maintenance:result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ message:err.message });
    serverError(res,err);
  } finally { client.release(); }
}

export async function removeMaintenance(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE asset_maintenance SET is_voided=TRUE,voided_at=NOW(),voided_by=$1,updated_at=NOW()
      WHERE id=$2 AND asset_id=$3 AND is_voided=FALSE RETURNING id`, [req.user.id,req.params.maintenanceId,req.params.id]);
    if (!result.rows[0]) throw Object.assign(new Error('Maintenance record not found.'), { status:404 });
    await refreshMaintenanceState(client,req.params.id);
    await client.query('COMMIT');
    res.json({ message:'Maintenance record removed. An audit copy was preserved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ message:err.message });
    serverError(res,err);
  } finally { client.release(); }
}

export async function returnAsset(req, res) {
  const b=req.body, client=await pool.connect();
  try {
    await client.query('BEGIN');
    const asset=await client.query('SELECT * FROM serialized_assets WHERE id=$1 FOR UPDATE',[req.params.id]);
    if (!asset.rows[0]) throw Object.assign(new Error('Asset not found.'),{status:404});
    const assignment=await client.query("UPDATE asset_assignments SET status='returned',returned_at=$1,condition_on_return=$2,notes=COALESCE($3,notes),ended_by=$4 WHERE asset_id=$5 AND status='active' RETURNING id",[b.returned_at||today(),nullable(b.condition_on_return),nullable(b.notes),req.user.id,req.params.id]);
    if (!assignment.rows[0]) throw Object.assign(new Error('This asset has no active assignment.'),{status:409});
    await client.query("UPDATE serialized_assets SET status='returned',current_condition=COALESCE($1,current_condition),updated_at=NOW() WHERE id=$2",[nullable(b.condition_on_return),req.params.id]);
    await client.query('UPDATE items SET quantity=quantity+1 WHERE id=$1',[asset.rows[0].inventory_item_id]);
    await client.query('COMMIT'); res.json({message:'Item returned to inventory.'});
  } catch(err){await client.query('ROLLBACK');if(err.status)return res.status(err.status).json({message:err.message});serverError(res,err);}finally{client.release();}
}

export async function transferAsset(req,res){
  const b=req.body;if(!b.personnel_id)return res.status(400).json({message:'New personnel is required.'});const client=await pool.connect();
  try{await client.query('BEGIN');const ended=await client.query("UPDATE asset_assignments SET status='transferred',returned_at=$1,condition_on_return=$2,ended_by=$3 WHERE asset_id=$4 AND status='active' RETURNING id",[b.transfer_date||today(),nullable(b.condition),req.user.id,req.params.id]);if(!ended.rows[0])throw Object.assign(new Error('This asset has no active assignment.'),{status:409});await client.query('INSERT INTO asset_assignments (asset_id,personnel_id,assigned_at,condition_on_assignment,notes,assigned_by) VALUES ($1,$2,$3,$4,$5,$6)',[req.params.id,b.personnel_id,b.transfer_date||today(),b.condition||'good',nullable(b.notes),req.user.id]);await client.query("UPDATE serialized_assets SET status='assigned',current_condition=COALESCE($1,current_condition),updated_at=NOW() WHERE id=$2",[nullable(b.condition),req.params.id]);await client.query('COMMIT');res.json({message:'Item transferred successfully.'});}catch(err){await client.query('ROLLBACK');if(err.status)return res.status(err.status).json({message:err.message});serverError(res,err);}finally{client.release();}
}

export async function phaseOutAsset(req,res){
  const b=req.body;if(!clean(b.reason))return res.status(400).json({message:'A phase-out reason is required.'});const client=await pool.connect();
  try{await client.query('BEGIN');const asset=await client.query('SELECT status FROM serialized_assets WHERE id=$1 FOR UPDATE',[req.params.id]);if(!asset.rows[0])throw Object.assign(new Error('Asset not found.'),{status:404});if(asset.rows[0].status==='phased_out')throw Object.assign(new Error('This asset is already phased out.'),{status:409});await client.query("UPDATE asset_assignments SET status='phased_out',returned_at=$1,condition_on_return=$2,ended_by=$3 WHERE asset_id=$4 AND status='active'",[b.phase_out_date||today(),nullable(b.final_condition),req.user.id,req.params.id]);await client.query('INSERT INTO asset_phase_outs (asset_id,phase_out_date,reason,final_condition,disposal_method,approved_by,notes,recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[req.params.id,b.phase_out_date||today(),clean(b.reason),nullable(b.final_condition),nullable(b.disposal_method),nullable(b.approved_by),nullable(b.notes),req.user.id]);await client.query("UPDATE serialized_assets SET status='phased_out',current_condition=COALESCE($1,current_condition),updated_at=NOW() WHERE id=$2",[nullable(b.final_condition),req.params.id]);await client.query('COMMIT');res.json({message:'Item phased out. Its complete history was preserved.'});}catch(err){await client.query('ROLLBACK');if(err.status)return res.status(err.status).json({message:err.message});serverError(res,err);}finally{client.release();}
}

export async function publicQrLookup(req,res){
  try{const result=await pool.query(`SELECT sa.asset_code,sa.item_type,sa.status,sa.current_condition,i.name AS inventory_name,
    p.full_name AS assigned_to,p.department FROM serialized_assets sa JOIN items i ON i.id=sa.inventory_item_id
    LEFT JOIN asset_assignments aa ON aa.asset_id=sa.id AND aa.status='active' LEFT JOIN personnel p ON p.id=aa.personnel_id
    WHERE sa.qr_token=$1`,[req.params.token]);if(!result.rows[0])return res.status(404).json({message:'Asset not found.'});res.json(result.rows[0]);}catch(err){serverError(res,err);}
}
