// backend/controllers/ledgerController.js
import PDFDocument from 'pdfkit';
import ExcelJS     from 'exceljs';
import pool        from '../db/pool.js';

const COLORS = {
  primary: '#1E3A5F', accent: '#2563EB', light: '#F1F5F9',
  border: '#CBD5E1',  text: '#1E293B',   muted: '#64748B',
  white: '#FFFFFF',   rowAlt: '#EFF6FF',
};

function fmtDate(str) {
  return str ? new Date(str).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'N/A';
}

// ── shared data fetch ─────────────────────────────────────────
async function buildLedgerData(item_id) {
  const itemRes = await pool.query(
    `SELECT i.id, i.name, i.quantity AS current_stock, i.unit_price,
            c.name AS category,
            COALESCE(cls.classification_name, 'Unclassified') AS classification
     FROM items i
     LEFT JOIN categories c ON i.category_id = c.id
     LEFT JOIN classifications cls ON i.classification_id = cls.id
     WHERE i.id = $1`,
    [item_id]
  );
  if (!itemRes.rows[0]) return null;
  const item_info = itemRes.rows[0];

  const transactions = [];

  // IN — procurement batches
  const procureRes = await pool.query(
    `SELECT id, quantity, unit_price, date_procured FROM items
     WHERE name = (SELECT name FROM items WHERE id = $1)
     ORDER BY date_procured ASC, id ASC`, [item_id]
  );
  procureRes.rows.forEach(r => transactions.push({
    sort_date: r.date_procured || '1970-01-01',
    date: fmtDate(r.date_procured), type: 'IN',
    reference: `Procurement #${r.id}`, quantity: parseInt(r.quantity),
    details: `₱${parseFloat(r.unit_price).toFixed(2)} / unit`,
  }));

  // OUT — distributions
  const distRes = await pool.query(
    `SELECT d.id, d.quantity, d.distributed_at, d.recipient, d.department
     FROM distributions d WHERE d.item_id = $1 ORDER BY d.distributed_at ASC`, [item_id]
  );
  distRes.rows.forEach(r => transactions.push({
    sort_date: r.distributed_at || '1970-01-01',
    date: fmtDate(r.distributed_at), type: 'OUT',
    reference: `Distribution #${r.id}`, quantity: parseInt(r.quantity),
    details: `${r.recipient} — ${r.department}`,
  }));

  // OUT / RETURN — allocations
  const allocRes = await pool.query(
    `SELECT a.id, a.quantity, a.allocated_at, a.department, a.allocated_by, a.status
     FROM allocations a WHERE a.item_id = $1 AND a.status != 'deleted'
     ORDER BY a.allocated_at ASC`, [item_id]
  );
  allocRes.rows.forEach(r => transactions.push({
    sort_date: r.allocated_at || '1970-01-01',
    date: fmtDate(r.allocated_at),
    type: r.status === 'returned' ? 'RETURN' : 'OUT',
    reference: `Allocation #${r.id}`, quantity: parseInt(r.quantity),
    details: `${r.department} — ${r.allocated_by}`,
  }));

  transactions.sort((a, b) => new Date(a.sort_date) - new Date(b.sort_date));

  let balance = 0;
  const ledger_rows = transactions.map(t => {
    if (t.type === 'IN' || t.type === 'RETURN') balance += t.quantity;
    else balance -= t.quantity;
    return { ...t, balance };
  });

  const total_in      = transactions.filter(t => t.type === 'IN').reduce((s,t) => s + t.quantity, 0);
  const total_out     = transactions.filter(t => t.type === 'OUT').reduce((s,t) => s + t.quantity, 0);
  const total_returns = transactions.filter(t => t.type === 'RETURN').reduce((s,t) => s + t.quantity, 0);

  return {
    item_info,
    data: ledger_rows,
    summary: { txn_count: ledger_rows.length, total_in, total_out, total_returns, current_stock: item_info.current_stock },
  };
}

// ─────────────────────────────────────────────────────────────
// GET /api/ledger/:item_id
// ─────────────────────────────────────────────────────────────
export async function getItemLedger(req, res) {
  try {
    const result = await buildLedgerData(req.params.item_id);
    if (!result) return res.status(404).json({ status: 'error', message: 'Item not found.' });
    res.json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/ledger/:item_id/export?format=pdf|excel
// ─────────────────────────────────────────────────────────────
export async function exportItemLedger(req, res) {
  const { item_id } = req.params;
  const format = req.query.format || 'pdf';

  try {
    const result = await buildLedgerData(item_id);
    if (!result) return res.status(404).json({ message: 'Item not found.' });

    const { item_info: item, data: rows, summary } = result;
    const subtitle = `${item.name}  •  ${item.category}  •  ${item.classification}  •  Current Stock: ${item.current_stock}`;

    // ── PDF ────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ledger_${item.name.replace(/\s+/g,'_')}.pdf"`);
      doc.pipe(res);

      const pageW = doc.page.width;
      // Header bar
      doc.rect(20, 20, pageW - 40, 6).fill(COLORS.accent);
      doc.fontSize(8).fillColor(COLORS.muted).text('CCWD INVENTORY MANAGEMENT SYSTEM', 40, 36);
      doc.fontSize(8).fillColor(COLORS.muted).text(`Generated: ${new Date().toLocaleString('en-PH')}`, 40, 36, { align: 'right', width: pageW - 80 });
      doc.moveTo(40, 50).lineTo(pageW - 40, 50).lineWidth(0.5).strokeColor(COLORS.border).stroke();
      doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary).text('ITEM LEDGER REPORT', 40, 60, { align: 'center', width: pageW - 80 });
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.muted).text(subtitle, 40, 86, { align: 'center', width: pageW - 80 });
      doc.moveTo(40, 102).lineTo(pageW - 40, 102).lineWidth(1).strokeColor(COLORS.accent).stroke();

      // Summary bar
      doc.rect(40, 110, pageW - 80, 22).fill(COLORS.light);
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
         .text(`Transactions: ${summary.txn_count}   |   IN: +${summary.total_in}   |   OUT: -${summary.total_out}   |   Returns: +${summary.total_returns}   |   Current Stock: ${summary.current_stock}`,
           44, 118, { width: pageW - 88, align: 'center' });

      const cols = [
        { label: 'Date',      width: 80  },
        { label: 'Type',      width: 55  },
        { label: 'Reference', width: 110 },
        { label: 'Quantity',  width: 60  },
        { label: 'Balance',   width: 60  },
        { label: 'Details',   width: 235 },
      ];

      let y = 140, x;
      // Table header
      x = 40;
      cols.forEach(col => {
        doc.rect(x, y, col.width, 18).fill(COLORS.accent);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white).text(col.label, x + 4, y + 5, { width: col.width - 8, align: 'center' });
        x += col.width;
      });
      y += 18;

      // Table rows
      rows.forEach((row, i) => {
        if (y + 14 > doc.page.height - 40) { doc.addPage(); y = 50; }
        const bg = i % 2 === 1 ? COLORS.rowAlt : COLORS.white;
        x = 40;
        const vals = [row.date, row.type, row.reference, String(row.quantity), String(row.balance), row.details || ''];
        cols.forEach((col, ci) => {
          doc.rect(x, y, col.width, 14).fill(bg);
          doc.moveTo(x, y + 14).lineTo(x + col.width, y + 14).lineWidth(0.3).strokeColor(COLORS.border).stroke();
          const color = ci === 1
            ? (row.type === 'IN' ? '#059669' : row.type === 'RETURN' ? '#2563EB' : '#DC2626')
            : (ci === 3 ? (row.type === 'IN' || row.type === 'RETURN' ? '#059669' : '#DC2626') : COLORS.text);
          doc.fontSize(7.5).font('Helvetica').fillColor(color).text(vals[ci], x + 3, y + 3, { width: col.width - 6, align: 'center', lineBreak: false });
          x += col.width;
        });
        y += 14;
      });

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor(COLORS.muted).text('CCWD Inventory Management System', 40, doc.page.height - 28, { align: 'left', width: (pageW - 80) / 2 });
        doc.fontSize(7).fillColor(COLORS.muted).text(`Page ${i + 1} of ${pages.count}`, 40, doc.page.height - 28, { align: 'right', width: pageW - 80 });
      }

      doc.end();
      return;
    }

    // ── Excel ──────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CCWD Inventory System';
    const sheet = wb.addWorksheet('Item Ledger');

    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = 'ITEM LEDGER REPORT';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:F3');
    sheet.getCell('A3').value = `Transactions: ${summary.txn_count}  |  IN: +${summary.total_in}  |  OUT: -${summary.total_out}  |  Returns: +${summary.total_returns}  |  Stock: ${summary.current_stock}`;
    sheet.getCell('A3').font = { size: 9, color: { argb: 'FF1E3A5F' } };
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    sheet.addRow([]);

    sheet.columns = [
      { key: 'date',      width: 18 },
      { key: 'type',      width: 10 },
      { key: 'reference', width: 22 },
      { key: 'quantity',  width: 12 },
      { key: 'balance',   width: 12 },
      { key: 'details',   width: 40 },
    ];

    const hRow = sheet.addRow(['Date', 'Type', 'Reference', 'Quantity', 'Balance', 'Details']);
    hRow.height = 22;
    hRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach((row, i) => {
      const r = sheet.addRow([row.date, row.type, row.reference, row.quantity, row.balance, row.details || '']);
      r.height = 17;
      const typeColor = row.type === 'IN' ? 'FF059669' : row.type === 'RETURN' ? 'FF2563EB' : 'FFDC2626';
      const qtyColor  = (row.type === 'IN' || row.type === 'RETURN') ? 'FF059669' : 'FFDC2626';
      r.eachCell((cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 1 ? 'FFEFF6FF' : 'FFFFFFFF' } };
        cell.font = { size: 9, color: { argb: col === 2 ? typeColor : col === 4 ? qtyColor : 'FF1E293B' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ledger_${item.name.replace(/\s+/g,'_')}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Export error: ' + err.message });
  }
}