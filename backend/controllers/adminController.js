// backend/controllers/adminController.js

import pool       from '../db/pool.js';
import PDFDocument from 'pdfkit';
import ExcelJS     from 'exceljs';

// ─────────────────────────────────────────────────────────────
// GET /api/admin/activity
// Returns paginated activity log with filters
// ─────────────────────────────────────────────────────────────
export async function getActivityLog(req, res) {
  const {
    page = 1, limit = 50,
    user_id, module, action,
    start_date, end_date, search,
  } = req.query;

  const offset = (page - 1) * limit;
  const params = [];
  let   idx    = 1;
  let   where  = 'WHERE 1=1';

  if (user_id)    { where += ` AND a.user_id = $${idx++}`;     params.push(user_id);    }
  if (module)     { where += ` AND a.module = $${idx++}`;      params.push(module);     }
  if (action)     { where += ` AND a.action = $${idx++}`;      params.push(action);     }
  if (start_date) { where += ` AND a.created_at >= $${idx++}`; params.push(start_date); }
  if (end_date)   { where += ` AND a.created_at <= $${idx++}`; params.push(end_date + ' 23:59:59'); }
  if (search) {
    where += ` AND (a.description ILIKE $${idx} OR a.username ILIKE $${idx + 1})`;
    params.push(`%${search}%`, `%${search}%`);
    idx += 2;
  }

  try {
    const [logs, total] = await Promise.all([
      pool.query(
        `SELECT a.id, a.user_id, a.username, a.action, a.module,
                a.record_id, a.description, a.ip_address, a.created_at,
                a.old_data, a.new_data
         FROM activity_logs a
         ${where}
         ORDER BY a.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM activity_logs a ${where}`, params),
    ]);

    res.json({
      data:          logs.rows,
      total_records: parseInt(total.rows[0].count),
      total_pages:   Math.ceil(total.rows[0].count / limit),
      page:          parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/item-movement
// Shows all ins and outs for all items
// ─────────────────────────────────────────────────────────────
export async function getItemMovement(req, res) {
  const { item_id, start_date, end_date, type } = req.query;

  try {
    const movements = [];

    // Procurements (IN)
    if (!type || type === 'IN') {
      const q = await pool.query(
        `SELECT i.id AS item_id, i.name AS item_name, i.quantity,
                i.date_procured AS txn_date, 'IN' AS type,
                'Procurement' AS source,
                COALESCE(
                  (SELECT al.username FROM activity_logs al
                   WHERE al.module = 'items' AND al.action = 'CREATE'
                   AND al.record_id = i.id
                   ORDER BY al.created_at ASC LIMIT 1),
                  'system'
                ) AS performed_by
         FROM items i
         ${item_id ? 'WHERE i.id = $1' : ''}
         ORDER BY i.date_procured DESC`,
        item_id ? [item_id] : []
      );
      movements.push(...q.rows);
    }

    // Distributions (OUT)
    if (!type || type === 'OUT') {
      const q = await pool.query(
        `SELECT d.item_id, i.name AS item_name, d.quantity,
                d.distributed_at AS txn_date, 'OUT' AS type,
                'Distribution' AS source,
                d.approved_by AS performed_by
         FROM distributions d
         JOIN items i ON d.item_id = i.id
         ${item_id ? 'WHERE d.item_id = $1' : ''}
         ORDER BY d.distributed_at DESC`,
        item_id ? [item_id] : []
      );
      movements.push(...q.rows);
    }

    // Allocations (OUT)
    if (!type || type === 'ALLOC') {
      const q = await pool.query(
        `SELECT a.item_id, i.name AS item_name, a.quantity,
                a.allocated_at AS txn_date, 'ALLOC' AS type,
                'Allocation' AS source,
                a.allocated_by AS performed_by
         FROM allocations a
         JOIN items i ON a.item_id = i.id
         WHERE a.status != 'deleted'
         ${item_id ? 'AND a.item_id = $1' : ''}
         ORDER BY a.allocated_at DESC`,
        item_id ? [item_id] : []
      );
      movements.push(...q.rows);
    }

    // Sort by date desc
    movements.sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date));

    res.json({ data: movements, total: movements.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/user-report/:user_id
// Returns all transactions made by a specific user
// ─────────────────────────────────────────────────────────────
export async function getUserReport(req, res) {
  const { user_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    // Get user info
    const userRes = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
      [user_id]
    );
    if (!userRes.rows[0])
      return res.status(404).json({ message: 'User not found.' });

    const user = userRes.rows[0];

    // Get their activity logs
    const logsRes = await pool.query(
      `SELECT action, module, record_id, description, created_at
       FROM activity_logs
       WHERE user_id = $1
       ${start_date ? 'AND created_at >= $2' : ''}
       ${end_date   ? `AND created_at <= $${start_date ? 3 : 2}` : ''}
       ORDER BY created_at DESC`,
      [user_id, ...(start_date ? [start_date] : []), ...(end_date ? [end_date + ' 23:59:59'] : [])]
    );

    // Summary counts
    const summary = logsRes.rows.reduce((acc, log) => {
      const key = `${log.action}_${log.module}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      user,
      activity: logsRes.rows,
      summary,
      total_actions: logsRes.rows.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Overview stats for the admin dashboard
// ─────────────────────────────────────────────────────────────
export async function getAdminStats(req, res) {
  try {
    const [users, logs, todayLogs, modules] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM activity_logs'),
      pool.query(`SELECT COUNT(*) FROM activity_logs WHERE created_at >= CURRENT_DATE`),
      pool.query(
        `SELECT module, COUNT(*) as count
         FROM activity_logs
         GROUP BY module ORDER BY count DESC LIMIT 5`
      ),
    ]);

    res.json({
      total_users:        parseInt(users.rows[0].count),
      total_actions:      parseInt(logs.rows[0].count),
      actions_today:      parseInt(todayLogs.rows[0].count),
      top_modules:        modules.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/item-movement/export?format=pdf|excel&type=&start_date=&end_date=
// ─────────────────────────────────────────────────────────────
export async function exportItemMovement(req, res) {
  const { format = 'pdf', type, start_date, end_date } = req.query;

  try {
    const movements = [];

    // IN — Procurements
    if (!type || type === 'IN') {
      const q = await pool.query(
        `SELECT i.id AS item_id, i.name AS item_name, i.quantity,
                i.date_procured AS txn_date, 'IN' AS type, 'Procurement' AS source,
                COALESCE(
                  (SELECT al.username FROM activity_logs al
                   WHERE al.module = 'items' AND al.action = 'CREATE'
                   AND al.record_id = i.id ORDER BY al.created_at ASC LIMIT 1),
                  'system'
                ) AS performed_by
         FROM items i
         ${start_date ? 'WHERE i.date_procured >= $1' : ''}
         ${end_date ? (start_date ? 'AND i.date_procured <= $2' : 'WHERE i.date_procured <= $1') : ''}
         ORDER BY i.date_procured DESC`,
        [...(start_date ? [start_date] : []), ...(end_date ? [end_date + ' 23:59:59'] : [])]
      );
      movements.push(...q.rows);
    }

    // OUT — Distributions
    if (!type || type === 'OUT') {
      const q = await pool.query(
        `SELECT d.item_id, i.name AS item_name, d.quantity,
                d.distributed_at AS txn_date, 'OUT' AS type,
                'Distribution' AS source, d.approved_by AS performed_by
         FROM distributions d JOIN items i ON d.item_id = i.id
         ${start_date ? 'WHERE d.distributed_at >= $1' : ''}
         ${end_date ? (start_date ? 'AND d.distributed_at <= $2' : 'WHERE d.distributed_at <= $1') : ''}
         ORDER BY d.distributed_at DESC`,
        [...(start_date ? [start_date] : []), ...(end_date ? [end_date + ' 23:59:59'] : [])]
      );
      movements.push(...q.rows);
    }

    // ALLOC — Allocations
    if (!type || type === 'ALLOC') {
      const q = await pool.query(
        `SELECT a.item_id, i.name AS item_name, a.quantity,
                a.allocated_at AS txn_date, 'ALLOC' AS type,
                'Allocation' AS source, a.allocated_by AS performed_by
         FROM allocations a JOIN items i ON a.item_id = i.id
         WHERE a.status != 'deleted'
         ${start_date ? 'AND a.allocated_at >= $1' : ''}
         ${end_date ? (start_date ? 'AND a.allocated_at <= $2' : 'AND a.allocated_at <= $1') : ''}
         ORDER BY a.allocated_at DESC`,
        [...(start_date ? [start_date] : []), ...(end_date ? [end_date + ' 23:59:59'] : [])]
      );
      movements.push(...q.rows);
    }

    movements.sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date));

    const fmtDate = (str) => str ? new Date(str).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'N/A';
    const fmtDateTime = (str) => str ? new Date(str).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
    const period = start_date || end_date
      ? `${start_date ? fmtDate(start_date) : 'Beginning'} - ${end_date ? fmtDate(end_date) : 'Present'}`
      : 'All Time';
    const subtitle = `Item Movement Report | ${period} | ${movements.length} records`;

    // ── PDF ────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="item_movement_${Date.now()}.pdf"`);
      doc.pipe(res);

      const pageW = doc.page.width;
      doc.rect(20, 20, pageW - 40, 6).fill('#1E3A5F');
      doc.fontSize(8).fillColor('#64748B').text('CCWD INVENTORY MANAGEMENT SYSTEM', 40, 36);
      doc.fontSize(8).fillColor('#64748B').text(`Generated: ${new Date().toLocaleString('en-PH')}`, 40, 36, { align: 'right', width: pageW - 80 });
      doc.moveTo(40, 50).lineTo(pageW - 40, 50).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E3A5F').text('ITEM MOVEMENT REPORT', 40, 60, { align: 'center', width: pageW - 80 });
      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(subtitle, 40, 86, { align: 'center', width: pageW - 80 });
      doc.moveTo(40, 102).lineTo(pageW - 40, 102).lineWidth(1).strokeColor('#2563EB').stroke();

      // Summary bar
      const totalIn    = movements.filter(m => m.type === 'IN').reduce((s,m) => s + parseInt(m.quantity), 0);
      const totalOut   = movements.filter(m => m.type === 'OUT').reduce((s,m) => s + parseInt(m.quantity), 0);
      const totalAlloc = movements.filter(m => m.type === 'ALLOC').reduce((s,m) => s + parseInt(m.quantity), 0);
      doc.rect(40, 108, pageW - 80, 22).fill('#F1F5F9');
      doc.fontSize(8).font('Helvetica').fillColor('#1E293B')
         .text(`Total Records: ${movements.length}   |   IN: +${totalIn}   |   OUT: -${totalOut}   |   ALLOC: -${totalAlloc}`,
           44, 116, { width: pageW - 88, align: 'center' });

      const cols = [
        { label: 'Date/Time',    width: 90  },
        { label: 'Item',         width: 140 },
        { label: 'Type',         width: 50  },
        { label: 'Source',       width: 75  },
        { label: 'Quantity',     width: 55  },
        { label: 'Performed By', width: 100 },
      ];

      const availableWidth = pageW - 80;
      const widthScale = availableWidth / cols.reduce((sum, col) => sum + col.width, 0);
      cols.forEach(col => { col.width *= widthScale; });

      const cleanPdfText = (value) => String(value ?? '')
        .replace(/[•·]/g, ' | ')
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

      const drawMovementHeader = (headerY) => {
        let headerX = 40;
        cols.forEach(col => {
          doc.rect(headerX, headerY, col.width, 20).fill('#2563EB');
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
             .text(col.label, headerX + 4, headerY + 6, { width: col.width - 8, align: 'center', lineBreak: false });
          headerX += col.width;
        });
        return headerY + 20;
      };

      const startContinuationPage = () => {
        doc.addPage();
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E3A5F')
           .text('ITEM MOVEMENT REPORT (CONTINUED)', 40, 36, { align: 'center', width: pageW - 80 });
        return drawMovementHeader(54);
      };

      let y = drawMovementHeader(138);

      movements.forEach((m, i) => {
        const vals = [fmtDateTime(m.txn_date), m.item_name, m.type, m.source, String(m.quantity), m.performed_by || 'system'].map(cleanPdfText);
        doc.fontSize(7.5).font('Helvetica');
        const rowHeight = Math.min(30, Math.max(
          17,
          doc.heightOfString(vals[1], { width: cols[1].width - 8 }) + 7,
          doc.heightOfString(vals[5], { width: cols[5].width - 8 }) + 7,
        ));
        if (y + rowHeight > doc.page.height - 76) y = startContinuationPage();
        const bg = i % 2 === 1 ? '#EFF6FF' : '#FFFFFF';
        const typeColor = m.type === 'IN' ? '#059669' : m.type === 'OUT' ? '#DC2626' : '#2563EB';
        let x = 40;
        cols.forEach((col, ci) => {
          doc.rect(x, y, col.width, rowHeight).fill(bg);
          doc.moveTo(x, y + rowHeight).lineTo(x + col.width, y + rowHeight).lineWidth(0.3).strokeColor('#CBD5E1').stroke();
          const color = ci === 2 ? typeColor : '#1E293B';
          const wraps = ci === 1 || ci === 5;
          doc.fontSize(7.5).font('Helvetica').fillColor(color).text(vals[ci] || '-', x + 3, y + 4, {
            width: col.width - 6,
            height: rowHeight - 7,
            align: wraps ? 'left' : 'center',
            lineBreak: wraps,
            ellipsis: true,
          });
          x += col.width;
        });
        y += rowHeight;
      });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#64748B').text('CCWD Inventory Management System', 40, doc.page.height - 62, { align: 'left', width: (pageW - 80) / 2, lineBreak: false });
        doc.fontSize(7).fillColor('#64748B').text(`Page ${i + 1} of ${pages.count}`, 40, doc.page.height - 62, { align: 'right', width: pageW - 80, lineBreak: false });
      }
      doc.end();
      return;
    }

    // ── Excel ──────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CCWD Inventory System';
    const sheet = wb.addWorksheet('Item Movement');

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'ITEM MOVEMENT REPORT';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = `Generated: ${new Date().toLocaleString('en-PH')}`;
    sheet.getCell('A3').font = { size: 8, color: { argb: 'FF64748B' } };
    sheet.getCell('A3').alignment = { horizontal: 'center' };
    sheet.addRow([]);

    sheet.columns = [
      { key: 'date',      width: 22 },
      { key: 'item',      width: 30 },
      { key: 'type',      width: 10 },
      { key: 'source',    width: 16 },
      { key: 'qty',       width: 10 },
      { key: 'by',        width: 20 },
    ];

    const hRow = sheet.addRow(['Date/Time', 'Item', 'Type', 'Source', 'Quantity', 'Performed By']);
    hRow.height = 22;
    hRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    movements.forEach((m, i) => {
      const r = sheet.addRow([fmtDateTime(m.txn_date), m.item_name, m.type, m.source, m.quantity, m.performed_by || 'system']);
      r.height = 22;
      const typeColor = m.type === 'IN' ? 'FF059669' : m.type === 'OUT' ? 'FFDC2626' : 'FF2563EB';
      r.eachCell((cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 1 ? 'FFEFF6FF' : 'FFFFFFFF' } };
        cell.font = { size: 9, color: { argb: col === 3 ? typeColor : 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', wrapText: col === 2 || col === 6 };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      });
    });

    sheet.views = [{ state: 'frozen', ySplit: hRow.number, showGridLines: false }];
    sheet.autoFilter = { from: { row: hRow.number, column: 1 }, to: { row: Math.max(hRow.number, sheet.rowCount), column: 6 } };
    sheet.pageSetup = {
      orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      printTitlesRow: `${hRow.number}:${hRow.number}`,
      margins: { left: 0.3, right: 0.3, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 },
    };
    sheet.headerFooter.oddFooter = '&LCCWD Inventory Management System&CConfidential&RPage &P of &N';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="item_movement_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Export error: ' + err.message });
  }
}
