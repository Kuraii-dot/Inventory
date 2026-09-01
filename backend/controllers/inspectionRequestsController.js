import pool from '../db/pool.js';

const MATERIAL_CODE_OFFSET = 100_000_000;
const EDITABLE_STATUSES = new Set(['new', 'preparing', 'ready', 'cancelled']);

const catalogSql = `
  SELECT
    (100000000 + MIN(i.id) FILTER (WHERE i.is_active))::integer AS code,
    (MIN(i.id) FILTER (WHERE i.is_active))::bigint AS item_id,
    MIN(i.name) AS description,
    COALESCE(NULLIF(MIN(i.unit), ''), 'Pcs') AS unit,
    i.category_id::bigint AS category_id,
    MIN(c.name) AS category_name,
    i.classification_id::bigint AS classification_id,
    MIN(cl.classification_name) AS classification_name,
    MIN(i.unit_price) AS cost,
    COALESCE(SUM(i.quantity) FILTER (WHERE i.is_active), 0)::integer AS available_quantity,
    MAX(i.updated_at) AS updated_at
  FROM items i
  LEFT JOIN categories c ON c.id = i.category_id
  LEFT JOIN classifications cl ON cl.id = i.classification_id
  GROUP BY
    lower(trim(i.name)),
    lower(trim(COALESCE(i.unit, 'Pcs'))),
    i.category_id,
    i.classification_id
  HAVING bool_or(i.is_active)
`;

export async function getIntegrationMaterials(_req, res) {
  try {
    const result = await pool.query(`${catalogSql} ORDER BY description ASC`);
    res.json(result.rows.map(row => ({
      code: Number(row.code),
      itemId: Number(row.item_id),
      description: row.description,
      unit: row.unit,
      materialType: row.category_name,
      categoryId: Number(row.category_id),
      categoryName: row.category_name,
      classificationId: row.classification_id === null ? null : Number(row.classification_id),
      classificationName: row.classification_name,
      cost: row.cost === null ? null : Number(row.cost),
      availableQuantity: Number(row.available_quantity || 0),
      isStandard: true,
      updatedAt: row.updated_at,
    })));
  } catch (err) {
    res.status(500).json({ message: `Could not load the inventory material catalog: ${err.message}` });
  }
}

export async function upsertIntegrationInspectionRequest(req, res) {
  const payload = req.body || {};
  const submissionId = req.params.submissionId;
  if (!submissionId || !payload.applicationNo || !payload.applicantName) {
    return res.status(400).json({ message: 'Submission ID, application number, and applicant name are required.' });
  }

  const materials = Array.isArray(payload.materials) ? payload.materials : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      `INSERT INTO inspection_requests
        (source_submission_id, tcms_application_id, application_no, applicant_name, address,
         barangay, inspector_name, date_inspected, recommendation, inspection_remarks,
         source_submitted_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (source_submission_id) DO UPDATE SET
         tcms_application_id = EXCLUDED.tcms_application_id,
         application_no = EXCLUDED.application_no,
         applicant_name = EXCLUDED.applicant_name,
         address = EXCLUDED.address,
         barangay = EXCLUDED.barangay,
         inspector_name = EXCLUDED.inspector_name,
         date_inspected = EXCLUDED.date_inspected,
         recommendation = EXCLUDED.recommendation,
         inspection_remarks = EXCLUDED.inspection_remarks,
         source_submitted_at = EXCLUDED.source_submitted_at,
         updated_at = NOW()
       RETURNING id, warehouse_modified_at`,
      [
        submissionId,
        payload.tcmsApplicationId,
        payload.applicationNo,
        payload.applicantName,
        payload.address || null,
        payload.barangay || null,
        payload.inspectorName || null,
        payload.dateInspected || null,
        payload.recommendation || null,
        payload.remarks || null,
        payload.submittedAt || null,
      ]
    );

    const requestId = requestResult.rows[0].id;
    const canRefreshPreparedCopy = requestResult.rows[0].warehouse_modified_at === null;
    await client.query(
      `UPDATE inspection_request_items
       SET source_active = false, updated_at = NOW()
       WHERE request_id = $1 AND source_material_code IS NOT NULL`,
      [requestId]
    );

    for (const material of materials) {
      const materialCode = Number(material.code);
      if (!Number.isInteger(materialCode) || materialCode <= 0) continue;

      const mappedItemId = materialCode >= MATERIAL_CODE_OFFSET
        ? materialCode - MATERIAL_CODE_OFFSET
        : null;
      const description = String(material.description || `Material ${materialCode}`).trim();
      const quantity = Math.max(1, Number.parseInt(material.quantity, 10) || 1);

      await client.query(
        `INSERT INTO inspection_request_items
          (request_id, source_material_code, source_active, inspector_description,
           inspector_quantity, inspector_category, inspector_classification,
           prepared_item_id, prepared_description, prepared_quantity,
           is_inventory_added, updated_at)
         VALUES ($1,$2,true,$3,$4,$5,$6,$7,$3,$4,false,NOW())
         ON CONFLICT (request_id, source_material_code) WHERE source_material_code IS NOT NULL
         DO UPDATE SET
           source_active = true,
           inspector_description = EXCLUDED.inspector_description,
           inspector_quantity = EXCLUDED.inspector_quantity,
           inspector_category = EXCLUDED.inspector_category,
           inspector_classification = EXCLUDED.inspector_classification,
           prepared_item_id = CASE WHEN $8 THEN EXCLUDED.prepared_item_id ELSE inspection_request_items.prepared_item_id END,
           prepared_description = CASE WHEN $8 THEN EXCLUDED.prepared_description ELSE inspection_request_items.prepared_description END,
           prepared_quantity = CASE WHEN $8 THEN EXCLUDED.prepared_quantity ELSE inspection_request_items.prepared_quantity END,
           updated_at = NOW()`,
        [
          requestId,
          materialCode,
          description,
          quantity,
          material.categoryName || null,
          material.classificationName || null,
          mappedItemId,
          canRefreshPreparedCopy,
        ]
      );
    }

    if (canRefreshPreparedCopy) {
      await client.query(
        `DELETE FROM inspection_request_items
         WHERE request_id = $1 AND source_material_code IS NOT NULL AND source_active = false`,
        [requestId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, requestId: Number(requestId) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: `Could not synchronize the inspection request: ${err.message}` });
  } finally {
    client.release();
  }
}

export async function getIntegrationInspectionRequest(req, res) {
  try {
    const requestResult = await pool.query(
      `SELECT source_submission_id, status, warehouse_remarks,
              warehouse_modified_at, released_at
       FROM inspection_requests
       WHERE source_submission_id = $1`,
      [req.params.submissionId]
    );
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ message: 'Inspection request not found.' });

    const itemsResult = await pool.query(
      `SELECT ri.source_material_code, ri.source_active,
              ri.inspector_description, ri.inspector_quantity,
              ri.inspector_category, ri.inspector_classification,
              ri.prepared_item_id, ri.prepared_description, ri.prepared_quantity,
              ri.warehouse_remarks AS line_remarks,
              i.unit, i.unit_price,
              c.name AS category_name,
              cl.classification_name
       FROM inspection_request_items ri
       LEFT JOIN items i ON i.id = ri.prepared_item_id
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN classifications cl ON cl.id = i.classification_id
       WHERE ri.request_id = (
         SELECT id FROM inspection_requests WHERE source_submission_id = $1
       )
       ORDER BY ri.is_inventory_added, ri.id`,
      [req.params.submissionId]
    );

    const inspectorMaterials = itemsResult.rows
      .filter(row => row.source_active && row.source_material_code)
      .map(row => ({
        code: Number(row.source_material_code),
        description: row.inspector_description,
        quantity: Number(row.inspector_quantity || 1),
        categoryName: row.inspector_category,
        classificationName: row.inspector_classification,
      }));

    const preparedMaterials = itemsResult.rows
      .filter(row => Number(row.prepared_quantity) > 0 && row.prepared_item_id)
      .map(row => ({
        code: MATERIAL_CODE_OFFSET + Number(row.prepared_item_id),
        itemId: Number(row.prepared_item_id),
        description: row.prepared_description || row.inspector_description,
        quantity: Number(row.prepared_quantity),
        unit: row.unit,
        unitPrice: row.unit_price === null ? null : Number(row.unit_price),
        categoryName: row.category_name,
        classificationName: row.classification_name,
        remarks: row.line_remarks,
      }));

    res.json({
      sourceSubmissionId: request.source_submission_id,
      status: request.status,
      warehouseRemarks: request.warehouse_remarks,
      warehouseModifiedAt: request.warehouse_modified_at,
      releasedAt: request.released_at,
      inspectorMaterials,
      preparedMaterials,
    });
  } catch (err) {
    res.status(500).json({ message: `Could not load the prepared inspection materials: ${err.message}` });
  }
}

export async function getInspectionRequestCatalog(req, res) {
  const search = String(req.query.search || '').trim();
  try {
    const params = [];
    const where = search ? ' WHERE description ILIKE $1' : '';
    if (search) params.push(`%${search}%`);
    const result = await pool.query(`SELECT * FROM (${catalogSql}) catalog${where} ORDER BY description ASC`, params);
    res.json(result.rows.map(row => ({
      code: Number(row.code),
      item_id: Number(row.item_id),
      description: row.description,
      unit: row.unit,
      material_type: row.category_name,
      category_id: Number(row.category_id),
      category_name: row.category_name,
      classification_id: row.classification_id === null ? null : Number(row.classification_id),
      classification_name: row.classification_name,
      unit_price: row.cost === null ? null : Number(row.cost),
      available_quantity: Number(row.available_quantity || 0),
    })));
  } catch (err) {
    const message = err.code === '42P01'
      ? 'Inspection request tables are not installed. Run supabase/migrations/202608240001_tcms_inspection_requests.sql in the Inventory Supabase SQL Editor.'
      : err.message;
    res.status(500).json({ message });
  }
}

export async function getInspectionRequests(req, res) {
  const { search = '', status = '', page = 1, limit = 30 } = req.query;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 30));
  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(r.application_no ILIKE $${params.length} OR r.applicant_name ILIKE $${params.length} OR r.barangay ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    clauses.push(`r.status = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM inspection_requests r ${where}`, params);
    params.push(pageSize, (pageNumber - 1) * pageSize);
    const result = await pool.query(
      `SELECT r.*,
         COUNT(ri.id) FILTER (WHERE ri.source_active AND ri.inspector_quantity > 0) AS requested_count,
         COUNT(ri.id) FILTER (WHERE ri.prepared_quantity > 0) AS prepared_count
       FROM inspection_requests r
       LEFT JOIN inspection_request_items ri ON ri.request_id = r.id
       ${where}
       GROUP BY r.id
       ORDER BY CASE r.status
         WHEN 'new' THEN 0 WHEN 'preparing' THEN 1 WHEN 'ready' THEN 2
         WHEN 'released' THEN 3 ELSE 4 END, r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const total = Number(countResult.rows[0].count);
    res.json({
      data: result.rows,
      total,
      page: pageNumber,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    const message = err.code === '42P01'
      ? 'Inspection request tables are not installed. Run supabase/migrations/202608240001_tcms_inspection_requests.sql in the Inventory Supabase SQL Editor.'
      : err.message;
    res.status(500).json({ message });
  }
}

export async function getInspectionRequestById(req, res) {
  try {
    const requestResult = await pool.query('SELECT * FROM inspection_requests WHERE id = $1', [req.params.id]);
    if (!requestResult.rows[0]) return res.status(404).json({ message: 'Inspection request not found.' });

    const itemsResult = await pool.query(
      `SELECT ri.*,
         i.name AS inventory_item_name,
         i.category_id AS prepared_category_id,
         i.classification_id AS prepared_classification_id,
         i.unit,
         i.unit_price,
         c.name AS category_name,
         cl.classification_name,
         COALESCE(stock.available_quantity, 0)::integer AS available_quantity
       FROM inspection_request_items ri
       LEFT JOIN items i ON i.id = ri.prepared_item_id
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN classifications cl ON cl.id = i.classification_id
       LEFT JOIN LATERAL (
         SELECT SUM(batch.quantity) FILTER (WHERE batch.is_active) AS available_quantity
         FROM items batch
         WHERE i.id IS NOT NULL AND lower(trim(batch.name)) = lower(trim(i.name))
       ) stock ON true
       WHERE ri.request_id = $1
       ORDER BY ri.is_inventory_added, ri.id`,
      [req.params.id]
    );
    res.json({ ...requestResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateInspectionPreparation(req, res) {
  const { status = 'preparing', warehouse_remarks = '', items = [] } = req.body || {};
  if (!EDITABLE_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Invalid preparation status.' });
  }
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'Prepared items must be an array.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      'SELECT id, status FROM inspection_requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    const request = requestResult.rows[0];
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inspection request not found.' });
    }
    if (request.status === 'released') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Released requests can no longer be edited.' });
    }

    await client.query('DELETE FROM inspection_request_items WHERE request_id = $1 AND is_inventory_added = true', [request.id]);
    await client.query(
      `UPDATE inspection_request_items SET prepared_quantity = 0, updated_at = NOW()
       WHERE request_id = $1 AND is_inventory_added = false`,
      [request.id]
    );

    for (const prepared of items) {
      const itemId = Number.parseInt(prepared.item_id, 10);
      const quantity = Number.parseInt(prepared.quantity, 10);
      if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(quantity) || quantity <= 0) continue;

      const inventoryResult = await client.query(
        'SELECT id, name FROM items WHERE id = $1 AND is_active = true',
        [itemId]
      );
      const inventoryItem = inventoryResult.rows[0];
      if (!inventoryItem) throw new Error(`Inventory item ${itemId} is unavailable.`);

      const lineId = Number.parseInt(prepared.line_id, 10);
      const notes = String(prepared.warehouse_remarks || '').trim() || null;
      if (Number.isInteger(lineId) && lineId > 0) {
        const updated = await client.query(
          `UPDATE inspection_request_items SET
             prepared_item_id = $1, prepared_description = $2, prepared_quantity = $3,
             warehouse_remarks = $4, updated_at = NOW()
           WHERE id = $5 AND request_id = $6
           RETURNING id`,
          [itemId, inventoryItem.name, quantity, notes, lineId, request.id]
        );
        if (updated.rowCount) continue;
      }

      await client.query(
        `INSERT INTO inspection_request_items
          (request_id, prepared_item_id, prepared_description, prepared_quantity,
           inspector_quantity, is_inventory_added, warehouse_remarks)
         VALUES ($1,$2,$3,$4,0,true,$5)`,
        [request.id, itemId, inventoryItem.name, quantity, notes]
      );
    }

    await client.query(
      `UPDATE inspection_requests SET status = $1, warehouse_remarks = $2,
         warehouse_modified_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [status, warehouse_remarks || null, request.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Prepared materials updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}

export async function releaseInspectionMaterials(req, res) {
  const department = String(req.body?.department || 'Engineering').trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      'SELECT * FROM inspection_requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    const request = requestResult.rows[0];
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inspection request not found.' });
    }
    if (request.status === 'released') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This request has already been released.' });
    }
    if (request.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Cancelled requests cannot be released.' });
    }

    const linesResult = await client.query(
      `SELECT ri.prepared_item_id, ri.prepared_quantity, i.name, i.category_id,
              i.classification_id, i.unit
       FROM inspection_request_items ri
       JOIN items i ON i.id = ri.prepared_item_id
       WHERE ri.request_id = $1 AND ri.prepared_quantity > 0`,
      [request.id]
    );
    if (!linesResult.rows.length) throw new Error('Add at least one prepared material before release.');

    for (const line of linesResult.rows) {
      const batches = await client.query(
        `SELECT id, quantity, unit_price FROM items
         WHERE lower(trim(name)) = lower(trim($1))
           AND category_id = $2
           AND classification_id IS NOT DISTINCT FROM $3
           AND lower(trim(COALESCE(unit, 'Pcs'))) = lower(trim(COALESCE($4, 'Pcs')))
           AND is_active = true AND quantity > 0
         ORDER BY date_procured ASC, id ASC FOR UPDATE`,
        [line.name, line.category_id, line.classification_id, line.unit]
      );
      let remaining = Number(line.prepared_quantity);
      let totalValue = 0;
      for (const batch of batches.rows) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(batch.quantity));
        remaining -= deduct;
        totalValue += deduct * Number(batch.unit_price || 0);
        await client.query('UPDATE items SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [deduct, batch.id]);
      }
      if (remaining > 0) throw new Error(`Not enough stock available for ${line.name}.`);

      await client.query(
        `INSERT INTO distributions
          (item_id, category_id, recipient, department, debit_to, approved_by, quantity,
           purpose, date, time, total_value, distributed_at, inspection_request_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,LOCALTIME,$9,NOW(),$10)`,
        [
          line.prepared_item_id,
          line.category_id,
          request.applicant_name,
          department,
          request.application_no,
          req.user?.username || 'Inventory',
          line.prepared_quantity,
          `Materials for TCMS application ${request.application_no}`,
          totalValue,
          request.id,
        ]
      );
    }

    await client.query(
      `UPDATE inspection_requests SET status = 'released', released_at = NOW(),
         released_by_user_id = $1, warehouse_modified_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user?.id || null, request.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Materials released and inventory stock updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
}
