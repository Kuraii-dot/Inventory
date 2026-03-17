// backend/controllers/reportsController.js
// Converted from:
//   pages/forms/generate_report.php     → distributionsReport()
//   pages/forms/overall_report.php      → overallReport()
//   pages/forms/department_report.php   → departmentReport()
//   includes/report_excel.php           → generateExcel() helper
//   includes/report_pdf.php             → generatePDF() helper
//
// PHP used: FPDF + PhpSpreadsheet
// Node.js uses: pdfkit (PDF) + exceljs (Excel)

import PDFDocument from 'pdfkit';
import ExcelJS     from 'exceljs';
import pool        from '../db/pool.js';

// ─── Color palette ────────────────────────────────────────────
const COLORS = {
  primary:    '#1E3A5F',  // deep navy
  accent:     '#2563EB',  // bright blue
  accent2:    '#0EA5E9',  // sky blue
  success:    '#059669',  // emerald
  warning:    '#D97706',  // amber
  danger:     '#DC2626',  // red
  light:      '#F1F5F9',  // slate-100
  lighter:    '#F8FAFC',  // slate-50
  border:     '#CBD5E1',  // slate-300
  text:       '#1E293B',  // slate-800
  muted:      '#64748B',  // slate-500
  white:      '#FFFFFF',
  rowAlt:     '#EFF6FF',  // blue-50
};

// ─── PDF helpers ──────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function drawPageFrame(doc) {
  // Subtle border around the page
  doc.save()
     .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .lineWidth(0.5)
     .strokeColor(COLORS.border)
     .stroke()
     .restore();
}

function drawReportHeader(doc, title, subtitle, accentColor = COLORS.accent) {
  const pageW = doc.page.width;

  // Top accent bar
  doc.rect(20, 20, pageW - 40, 6)
     .fill(accentColor);

  // Logo area / system name
  doc.fontSize(8).fillColor(COLORS.muted)
     .text('CCWD INVENTORY MANAGEMENT SYSTEM', 40, 36, { align: 'left' });

  // Generated timestamp top right
  doc.fontSize(8).fillColor(COLORS.muted)
     .text('Generated: ' + new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
       40, 36, { align: 'right', width: pageW - 80 });

  // Divider
  doc.moveTo(40, 50).lineTo(pageW - 40, 50)
     .lineWidth(0.5).strokeColor(COLORS.border).stroke();

  // Title
  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.primary)
     .text(title, 40, 62, { align: 'center', width: pageW - 80 });

  // Subtitle
  doc.fontSize(10).font('Helvetica').fillColor(COLORS.muted)
     .text(subtitle, 40, 90, { align: 'center', width: pageW - 80 });

  // Second divider
  doc.moveTo(40, 108).lineTo(pageW - 40, 108)
     .lineWidth(1).strokeColor(accentColor).stroke();

  doc.moveDown(0.5);
  return 120; // return Y position after header
}

function drawTableHeader(doc, columns, y, accentColor = COLORS.accent) {
  const [r, g, b] = hexToRgb(accentColor);
  let x = 40;
  const rowH = 20;

  columns.forEach(col => {
    // Header background
    doc.rect(x, y, col.width, rowH).fill(accentColor);
    // Header text
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white)
       .text(col.label, x + 4, y + 6, { width: col.width - 8, align: col.align || 'left' });
    x += col.width;
  });
  return y + rowH;
}

function drawTableRow(doc, columns, values, y, isAlt = false, pageH = 792) {
  // Auto page break
  if (y + 18 > pageH - 60) {
    doc.addPage();
    drawPageFrame(doc);
    y = 50;
  }

  const rowH = 16;
  let x = 40;
  const bgColor = isAlt ? COLORS.rowAlt : COLORS.white;

  columns.forEach((col, i) => {
    // Row background
    doc.rect(x, y, col.width, rowH).fill(bgColor);
    // Cell border (bottom only for clean look)
    doc.moveTo(x, y + rowH).lineTo(x + col.width, y + rowH)
       .lineWidth(0.3).strokeColor(COLORS.border).stroke();
    // Cell text
    const val = values[i] ?? '—';
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
       .text(String(val), x + 4, y + 4, { width: col.width - 8, align: col.align || 'left', lineBreak: false });
    x += col.width;
  });
  return y + rowH;
}

function drawTotalRow(doc, columns, label, value, y, accentColor = COLORS.accent) {
  if (y + 22 > doc.page.height - 60) { doc.addPage(); drawPageFrame(doc); y = 50; }
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  const lastCol = columns[columns.length - 1];
  const labelW  = totalW - lastCol.width;

  doc.rect(40, y, totalW, 20).fill(accentColor);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white)
     .text(label, 44, y + 5, { width: labelW - 8, align: 'right' });
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white)
     .text(value, 40 + labelW + 4, y + 5, { width: lastCol.width - 8, align: 'right' });
  return y + 22;
}

function drawSignatories(doc, signatories, y) {
  if (!signatories.some(s => s.value)) return;
  if (y + 60 > doc.page.height - 40) { doc.addPage(); drawPageFrame(doc); y = 50; }

  doc.moveTo(40, y + 10).lineTo(doc.page.width - 40, y + 10)
     .lineWidth(0.5).strokeColor(COLORS.border).stroke();

  const perW = (doc.page.width - 80) / signatories.length;
  signatories.forEach((s, i) => {
    const sx = 40 + i * perW;
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted)
       .text(s.label.toUpperCase(), sx, y + 16, { width: perW - 10, align: 'center' });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
       .text(s.value || '—', sx, y + 28, { width: perW - 10, align: 'center' });
    doc.moveTo(sx + 10, y + 40).lineTo(sx + perW - 20, y + 40)
       .lineWidth(0.5).strokeColor(COLORS.border).stroke();
  });
}

function drawFooter(doc) {
  const y = doc.page.height - 40;
  const pageW = doc.page.width;
  doc.rect(20, y - 4, pageW - 40, 0.5).fill(COLORS.border);
  doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted)
     .text('CCWD Inventory Management System  •  Confidential', 40, y + 4, { align: 'left', width: (pageW - 80) / 2 });
  doc.fontSize(7).fillColor(COLORS.muted)
     .text(`Page ${doc.bufferedPageRange().count}`, 40, y + 4, { align: 'right', width: pageW - 80 });
}

// ─── Excel helpers ────────────────────────────────────────────
function styleExcelHeader(sheet, row, cols) {
  row.height = 24;
  cols.forEach((_, i) => {
    const cell = row.getCell(i + 1);
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF2563EB' } },
      bottom: { style: 'thin', color: { argb: 'FF2563EB' } },
    };
  });
}

function styleExcelRow(row, isAlt = false) {
  row.height = 18;
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFEFF6FF' : 'FFFFFFFF' } };
    cell.font = { size: 9, color: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
  });
}

function addExcelTitleBlock(sheet, title, subtitle, colCount) {
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(`A${titleRow.number}:${String.fromCharCode(64 + colCount)}${titleRow.number}`);
  titleRow.getCell(1).font      = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 32;

  const subRow = sheet.addRow([subtitle]);
  sheet.mergeCells(`A${subRow.number}:${String.fromCharCode(64 + colCount)}${subRow.number}`);
  subRow.getCell(1).font      = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  subRow.height = 20;

  const genRow = sheet.addRow([`Generated: ${new Date().toLocaleString('en-PH')}`]);
  sheet.mergeCells(`A${genRow.number}:${String.fromCharCode(64 + colCount)}${genRow.number}`);
  genRow.getCell(1).font      = { size: 8, color: { argb: 'FF64748B' } };
  genRow.getCell(1).alignment = { horizontal: 'center' };

  sheet.addRow([]); // spacer
}

function addExcelTotalRow(sheet, colCount, label, value) {
  const row = sheet.addRow([]);
  for (let i = 1; i <= colCount; i++) row.getCell(i).value = '';
  row.getCell(colCount - 1).value = label;
  row.getCell(colCount).value     = value;
  row.height = 22;
  row.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });
}

// ─── Date range helper ────────────────────────────────────────
function getDateRange(timeframe, from, to) {
  const today = new Date().toISOString().split('T')[0];
  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, new Date().getMonth() + 1, 0).getDate();

  switch (timeframe) {
    case 'today':   return { start: today, end: today };
    case 'daily':   return { start: today, end: today };
    case 'monthly': return { start: `${year}-${month}-01`, end: `${year}-${month}-${lastDay}` };
    case 'month':   return { start: `${year}-${month}-01`, end: `${year}-${month}-${lastDay}` };
    case 'year':    return { start: `${year}-01-01`, end: `${year}-12-31` };
    case 'custom':
      if (!from || !to) throw new Error('Please provide both From and To dates.');
      return { start: from, end: to };
    default:        return { start: today, end: today };
  }
}

function fmtCurrency(n) { return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }); }
function fmtDate(str)    { return str ? new Date(str).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'N/A'; }
function fmtDateTime(str){ return str ? new Date(str).toLocaleString('en-PH',  { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'; }

// ══════════════════════════════════════════════════════════════
// 1. DISTRIBUTIONS REPORT
//    Converted from: pages/forms/generate_report.php
//    POST /api/reports/distributions
// ══════════════════════════════════════════════════════════════
export async function distributionsReport(req, res) {
  const { format = 'pdf', timeframe = 'today', from, to } = req.body;

  try {
    const { start, end } = getDateRange(timeframe, from, to);

    const result = await pool.query(`
      SELECT d.distributed_at, d.quantity, d.total_value,
             d.recipient, d.department, d.approved_by, d.purpose,
             i.name AS item, c.name AS category
      FROM distributions d
      JOIN items i ON d.item_id = i.id
      JOIN categories c ON d.category_id = c.id
      WHERE d.distributed_at BETWEEN $1 AND $2
      ORDER BY d.distributed_at ASC`,
      [start + ' 00:00:00', end + ' 23:59:59']
    );
    const rows = result.rows;
    const totalValue = rows.reduce((s, r) => s + parseFloat(r.total_value || 0), 0);
    const subtitle   = `Period: ${fmtDate(start)}  –  ${fmtDate(end)}  •  ${rows.length} record${rows.length !== 1 ? 's' : ''}`;

    // ── PDF ──────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="distributions_report_${Date.now()}.pdf"`);
      doc.pipe(res);

      drawPageFrame(doc);
      let y = drawReportHeader(doc, 'DISTRIBUTIONS REPORT', subtitle, COLORS.accent);

      const cols = [
        { label: 'Date / Time',   width: 80,  align: 'left'  },
        { label: 'Item',          width: 100, align: 'left'  },
        { label: 'Category',      width: 70,  align: 'left'  },
        { label: 'Recipient',     width: 80,  align: 'left'  },
        { label: 'Department',    width: 70,  align: 'left'  },
        { label: 'Qty',           width: 30,  align: 'center'},
        { label: 'Total Value',   width: 60,  align: 'right' },
        { label: 'Approved By',   width: 70,  align: 'left'  },
      ];

      y = drawTableHeader(doc, cols, y + 8, COLORS.accent);

      rows.forEach((r, i) => {
        y = drawTableRow(doc, cols, [
          fmtDateTime(r.distributed_at),
          r.item, r.category, r.recipient, r.department,
          r.quantity, fmtCurrency(r.total_value), r.approved_by,
        ], y, i % 2 === 1);
      });

      y = drawTotalRow(doc, cols, 'TOTAL VALUE', fmtCurrency(totalValue), y + 4);
      drawSignatories(doc, [], y + 10);

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc);
      }

      doc.end();
      return;
    }

    // ── Excel ────────────────────────────────────────────────
    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'CCWD Inventory System';
    wb.created  = new Date();
    const sheet = wb.addWorksheet('Distributions Report');

    const colDefs = [
      { header: 'Date / Time',  key: 'dt',    width: 20 },
      { header: 'Item',         key: 'item',  width: 28 },
      { header: 'Category',     key: 'cat',   width: 20 },
      { header: 'Recipient',    key: 'recip', width: 22 },
      { header: 'Department',   key: 'dept',  width: 18 },
      { header: 'Qty',          key: 'qty',   width: 8  },
      { header: 'Total Value',  key: 'val',   width: 16 },
      { header: 'Approved By',  key: 'appr',  width: 20 },
    ];
    sheet.columns = colDefs;

    addExcelTitleBlock(sheet, 'DISTRIBUTIONS REPORT', subtitle, colDefs.length);
    const hRow = sheet.addRow(colDefs.map(c => c.header));
    styleExcelHeader(sheet, hRow, colDefs);

    rows.forEach((r, i) => {
      const row = sheet.addRow([
        fmtDateTime(r.distributed_at), r.item, r.category,
        r.recipient, r.department, r.quantity,
        parseFloat(r.total_value || 0), r.approved_by,
      ]);
      row.getCell(7).numFmt = '₱#,##0.00';
      styleExcelRow(row, i % 2 === 1);
    });

    addExcelTotalRow(sheet, colDefs.length, 'TOTAL VALUE', totalValue);
    sheet.getCell(sheet.rowCount, colDefs.length).numFmt = '₱#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="distributions_report_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Report error: ' + err.message });
  }
}

// ══════════════════════════════════════════════════════════════
// 2. OVERALL ITEM REPORT
//    Converted from: pages/forms/overall_report.php
//    POST /api/reports/overall
// ══════════════════════════════════════════════════════════════
export async function overallReport(req, res) {
  const {
    format = 'pdf', timeframe = 'daily',
    from, to, category_id = 'all', item_id = 'all',
    prepared_by = '', reviewed_by = '', approved_by = '',
  } = req.body;

  try {
    const { start, end } = getDateRange(timeframe, from, to);

    let sql = `
      SELECT
        i.id, i.name AS item_name, i.unit_price,
        i.quantity AS stock_quantity,
        MIN(c.name) AS category_name,
        COALESCE(SUM(d.quantity), 0) AS total_distributed,
        (i.quantity - COALESCE(SUM(d.quantity), 0)) AS remaining_stock,
        ((i.quantity - COALESCE(SUM(d.quantity), 0)) * i.unit_price) AS stock_value,
        MAX(d.date) AS last_distribution_date
      FROM items i
      JOIN categories c ON i.category_id = c.id
      LEFT JOIN distributions d
        ON d.item_id = i.id AND d.date BETWEEN $1 AND $2
      WHERE 1=1`;

    const params = [start, end];
    let idx = 3;

    if (category_id !== 'all') { sql += ` AND i.category_id = $${idx++}`; params.push(category_id); }
    if (item_id     !== 'all') { sql += ` AND i.id = $${idx++}`;           params.push(item_id);     }

    sql += ' GROUP BY i.id ORDER BY i.name ASC';

    const result = await pool.query(sql, params);
    const rows   = result.rows;
    const grandTotal = rows.reduce((s, r) => s + parseFloat(r.stock_value || 0), 0);
    const subtitle   = `Period: ${fmtDate(start)}  –  ${fmtDate(end)}  •  ${rows.length} item${rows.length !== 1 ? 's' : ''}`;

    // ── PDF ──────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="overall_report_${Date.now()}.pdf"`);
      doc.pipe(res);

      drawPageFrame(doc);
      let y = drawReportHeader(doc, 'OVERALL ITEM REPORT', subtitle, COLORS.success);

      const cols = [
        { label: 'Item',            width: 120, align: 'left'  },
        { label: 'Category',        width: 80,  align: 'left'  },
        { label: 'Unit Price',      width: 60,  align: 'right' },
        { label: 'Stock',           width: 40,  align: 'center'},
        { label: 'Distributed',     width: 55,  align: 'center'},
        { label: 'Remaining',       width: 55,  align: 'center'},
        { label: 'Stock Value',     width: 70,  align: 'right' },
        { label: 'Last Distributed',width: 80,  align: 'center'},
      ];

      y = drawTableHeader(doc, cols, y + 8, COLORS.success);

      rows.forEach((r, i) => {
        y = drawTableRow(doc, cols, [
          r.item_name, r.category_name,
          fmtCurrency(r.unit_price),
          r.stock_quantity, r.total_distributed, r.remaining_stock,
          fmtCurrency(r.stock_value),
          fmtDate(r.last_distribution_date),
        ], y, i % 2 === 1, doc.page.height);
      });

      y = drawTotalRow(doc, cols, 'TOTAL STOCK VALUE', fmtCurrency(grandTotal), y + 4, COLORS.success);

      drawSignatories(doc, [
        { label: 'Prepared By',  value: prepared_by  },
        { label: 'Reviewed By',  value: reviewed_by  },
        { label: 'Approved By',  value: approved_by  },
      ], y + 16);

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) { doc.switchToPage(i); drawFooter(doc); }
      doc.end();
      return;
    }

    // ── Excel ────────────────────────────────────────────────
    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'CCWD Inventory System';
    wb.created  = new Date();
    const sheet = wb.addWorksheet('Overall Report');

    const colDefs = [
      { header: 'Item',             key: 'item',  width: 30 },
      { header: 'Category',         key: 'cat',   width: 20 },
      { header: 'Unit Price',       key: 'price', width: 14 },
      { header: 'Stock',            key: 'stock', width: 10 },
      { header: 'Distributed',      key: 'dist',  width: 14 },
      { header: 'Remaining',        key: 'rem',   width: 12 },
      { header: 'Stock Value',      key: 'val',   width: 16 },
      { header: 'Last Distributed', key: 'last',  width: 18 },
    ];
    sheet.columns = colDefs;

    addExcelTitleBlock(sheet, 'OVERALL ITEM REPORT', subtitle, colDefs.length);
    const hRow = sheet.addRow(colDefs.map(c => c.header));
    styleExcelHeader(sheet, hRow, colDefs);

    rows.forEach((r, i) => {
      const row = sheet.addRow([
        r.item_name, r.category_name,
        parseFloat(r.unit_price || 0), r.stock_quantity,
        r.total_distributed, r.remaining_stock,
        parseFloat(r.stock_value || 0), fmtDate(r.last_distribution_date),
      ]);
      row.getCell(3).numFmt = '₱#,##0.00';
      row.getCell(7).numFmt = '₱#,##0.00';
      styleExcelRow(row, i % 2 === 1);
    });

    addExcelTotalRow(sheet, colDefs.length, 'TOTAL STOCK VALUE', grandTotal);
    sheet.getCell(sheet.rowCount, colDefs.length).numFmt = '₱#,##0.00';

    // Signatories
    if (prepared_by || reviewed_by || approved_by) {
      sheet.addRow([]);
      const sigRow = sheet.addRow([
        `Prepared By: ${prepared_by}`, '', '',
        `Reviewed By: ${reviewed_by}`, '', '',
        `Approved By: ${approved_by}`,
      ]);
      sigRow.eachCell(c => { c.font = { bold: true, size: 9 }; });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="overall_report_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Report error: ' + err.message });
  }
}

// ══════════════════════════════════════════════════════════════
// 3. DEPARTMENT REPORT
//    Converted from: pages/forms/department_report.php
//    POST /api/reports/department
// ══════════════════════════════════════════════════════════════
export async function departmentReport(req, res) {
  const { format = 'pdf', timeframe = 'daily', from, to, department } = req.body;

  if (!department) return res.status(400).json({ message: 'Please select a department.' });

  try {
    const { start, end } = getDateRange(timeframe, from, to);

    const result = await pool.query(`
      SELECT
        d.department,
        c.name AS category_name,
        i.name AS item_name,
        i.unit_price,
        SUM(d.quantity) AS dept_distributed,
        SUM(d.quantity * i.unit_price) AS dept_value,
        MAX(d.date) AS last_distribution_date
      FROM distributions d
      INNER JOIN items i ON d.item_id = i.id
      INNER JOIN categories c ON i.category_id = c.id
      WHERE d.department = $1 AND d.date BETWEEN $2 AND $3
      GROUP BY d.department, c.name, i.name, i.unit_price
      ORDER BY c.name, i.name`,
      [department, start, end]
    );
    const rows       = result.rows;
    const grandTotal = rows.reduce((s, r) => s + parseFloat(r.dept_value || 0), 0);
    const subtitle   = `Department: ${department.toUpperCase()}  •  Period: ${fmtDate(start)} – ${fmtDate(end)}`;

    // ── PDF ──────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dept_report_${department}_${Date.now()}.pdf"`);
      doc.pipe(res);

      drawPageFrame(doc);
      let y = drawReportHeader(doc, 'DEPARTMENT DISTRIBUTION REPORT', subtitle, COLORS.warning);

      const cols = [
        { label: 'Category',         width: 90,  align: 'left'  },
        { label: 'Item',             width: 140, align: 'left'  },
        { label: 'Unit Price',       width: 60,  align: 'right' },
        { label: 'Qty Distributed',  width: 60,  align: 'center'},
        { label: 'Total Value',      width: 70,  align: 'right' },
        { label: 'Last Distributed', width: 80,  align: 'center'},
      ];

      y = drawTableHeader(doc, cols, y + 8, COLORS.warning);

      let currentCat = null;
      rows.forEach((r, i) => {
        // Category group row
        if (currentCat !== r.category_name) {
          currentCat = r.category_name;
          if (y + 20 > doc.page.height - 60) { doc.addPage(); drawPageFrame(doc); y = 50; }
          const totalW = cols.reduce((s, c) => s + c.width, 0);
          doc.rect(40, y, totalW, 16).fill(COLORS.light);
          doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary)
             .text(`  ${currentCat}`, 44, y + 4, { width: totalW - 8 });
          y += 16;
        }

        y = drawTableRow(doc, cols, [
          r.category_name, r.item_name,
          fmtCurrency(r.unit_price), r.dept_distributed,
          fmtCurrency(r.dept_value), fmtDate(r.last_distribution_date),
        ], y, i % 2 === 1, doc.page.height);
      });

      y = drawTotalRow(doc, cols, 'GRAND TOTAL', fmtCurrency(grandTotal), y + 4, COLORS.warning);

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) { doc.switchToPage(i); drawFooter(doc); }
      doc.end();
      return;
    }

    // ── Excel ────────────────────────────────────────────────
    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'CCWD Inventory System';
    wb.created  = new Date();
    const sheet = wb.addWorksheet('Department Report');

    const colDefs = [
      { header: 'Category',         key: 'cat',   width: 22 },
      { header: 'Item',             key: 'item',  width: 30 },
      { header: 'Unit Price',       key: 'price', width: 14 },
      { header: 'Qty Distributed',  key: 'qty',   width: 16 },
      { header: 'Total Value',      key: 'val',   width: 16 },
      { header: 'Last Distributed', key: 'last',  width: 18 },
    ];
    sheet.columns = colDefs;

    addExcelTitleBlock(sheet, 'DEPARTMENT DISTRIBUTION REPORT', subtitle, colDefs.length);
    const hRow = sheet.addRow(colDefs.map(c => c.header));
    styleExcelHeader(sheet, hRow, colDefs);

    let currentCat = null;
    rows.forEach((r, i) => {
      // Category group header row in Excel
      if (currentCat !== r.category_name) {
        currentCat = r.category_name;
        const catRow = sheet.addRow([`  ${r.category_name}`]);
        sheet.mergeCells(`A${catRow.number}:F${catRow.number}`);
        catRow.getCell(1).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        catRow.getCell(1).font   = { bold: true, size: 9, color: { argb: 'FF1E3A5F' } };
        catRow.height = 18;
      }

      const row = sheet.addRow([
        r.category_name, r.item_name,
        parseFloat(r.unit_price || 0), r.dept_distributed,
        parseFloat(r.dept_value || 0), fmtDate(r.last_distribution_date),
      ]);
      row.getCell(3).numFmt = '₱#,##0.00';
      row.getCell(5).numFmt = '₱#,##0.00';
      styleExcelRow(row, i % 2 === 1);
    });

    addExcelTotalRow(sheet, colDefs.length, 'GRAND TOTAL', grandTotal);
    sheet.getCell(sheet.rowCount, colDefs.length).numFmt = '₱#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="dept_report_${department}_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Report error: ' + err.message });
  }
}

// ══════════════════════════════════════════════════════════════
// 4. ALLOCATION REPORT
//    Converted from: pages/forms/generate_allocation_report.php
//    POST /api/reports/allocations
// ══════════════════════════════════════════════════════════════
export async function allocationsReport(req, res) {
  const { format = 'pdf', timeframe = 'today', from, to } = req.body;

  try {
    const { start, end } = getDateRange(timeframe, from, to);

    const result = await pool.query(`
      SELECT
        a.allocated_at, a.quantity, a.department,
        a.allocated_by, a.purpose, a.remarks, a.status,
        i.name AS item_name, c.name AS category_name
      FROM allocations a
      JOIN items i ON a.item_id = i.id
      JOIN categories c ON a.category_id = c.id
      WHERE a.allocated_at BETWEEN $1 AND $2
        AND a.status != 'deleted'
      ORDER BY a.allocated_at ASC`,
      [start + ' 00:00:00', end + ' 23:59:59']
    );
    const rows     = result.rows;
    const totalQty = rows.reduce((s, r) => s + parseInt(r.quantity || 0), 0);
    const subtitle = `Period: ${fmtDate(start)}  –  ${fmtDate(end)}  •  ${rows.length} allocation${rows.length !== 1 ? 's' : ''}`;

    // ── PDF ──────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="allocations_report_${Date.now()}.pdf"`);
      doc.pipe(res);

      drawPageFrame(doc);
      let y = drawReportHeader(doc, 'ALLOCATIONS REPORT', subtitle, COLORS.accent2);

      const cols = [
        { label: 'Date / Time',   width: 80,  align: 'left'  },
        { label: 'Item',          width: 110, align: 'left'  },
        { label: 'Category',      width: 80,  align: 'left'  },
        { label: 'Department',    width: 75,  align: 'left'  },
        { label: 'Allocated By',  width: 80,  align: 'left'  },
        { label: 'Qty',           width: 30,  align: 'center'},
        { label: 'Status',        width: 50,  align: 'center'},
        { label: 'Purpose',       width: 75,  align: 'left'  },
      ];

      y = drawTableHeader(doc, cols, y + 8, COLORS.accent2);

      rows.forEach((r, i) => {
        y = drawTableRow(doc, cols, [
          fmtDateTime(r.allocated_at),
          r.item_name, r.category_name, r.department,
          r.allocated_by, r.quantity,
          (r.status || 'active').toUpperCase(),
          (r.purpose || '').substring(0, 40),
        ], y, i % 2 === 1, doc.page.height);
      });

      y = drawTotalRow(doc, cols, 'TOTAL QUANTITY', totalQty, y + 4, COLORS.accent2);

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) { doc.switchToPage(i); drawFooter(doc); }
      doc.end();
      return;
    }

    // ── Excel ────────────────────────────────────────────────
    const wb    = new ExcelJS.Workbook();
    wb.creator  = 'CCWD Inventory System';
    wb.created  = new Date();
    const sheet = wb.addWorksheet('Allocations Report');

    const colDefs = [
      { header: 'Date / Time',  key: 'dt',    width: 20 },
      { header: 'Item',         key: 'item',  width: 28 },
      { header: 'Category',     key: 'cat',   width: 20 },
      { header: 'Department',   key: 'dept',  width: 18 },
      { header: 'Allocated By', key: 'by',    width: 20 },
      { header: 'Qty',          key: 'qty',   width: 8  },
      { header: 'Status',       key: 'stat',  width: 12 },
      { header: 'Purpose',      key: 'purp',  width: 30 },
    ];
    sheet.columns = colDefs;

    addExcelTitleBlock(sheet, 'ALLOCATIONS REPORT', subtitle, colDefs.length);
    const hRow = sheet.addRow(colDefs.map(c => c.header));
    styleExcelHeader(sheet, hRow, colDefs);

    rows.forEach((r, i) => {
      const row = sheet.addRow([
        fmtDateTime(r.allocated_at), r.item_name, r.category_name,
        r.department, r.allocated_by, r.quantity,
        (r.status || 'active').toUpperCase(), r.purpose,
      ]);
      styleExcelRow(row, i % 2 === 1);
    });

    addExcelTotalRow(sheet, colDefs.length, 'TOTAL QUANTITY', totalQty);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="allocations_report_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);

  } catch (err) {
    res.status(500).json({ message: 'Report error: ' + err.message });
  }
}