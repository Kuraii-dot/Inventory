<?php
include('../../includes/db.php');

// Libraries
require('../../vendor/autoload.php');
require('../../vendor/setasign/fpdf/fpdf.php');

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

// ------------------ Grab POST Data ------------------
$category_id   = $_POST['category_id'] ?? 'all';
$item_id       = $_POST['item_id'] ?? 'all';
$timeframe     = $_POST['timeframe'] ?? 'daily';
$from          = $_POST['from'] ?? null;
$to            = $_POST['to'] ?? null;
$report_type   = strtolower($_POST['report_type'] ?? $_POST['format'] ?? 'pdf');

// **Signatories**
$prepared_by   = $_POST['prepared_by'] ?? '';
$reviewed_by   = $_POST['reviewed_by'] ?? '';
$approved_by   = $_POST['approved_by'] ?? '';

$report_type = strtolower($report_type);

if (!in_array($report_type, ['pdf', 'excel'])) {
    die('Invalid report type.');
}


switch ($timeframe) {
    case 'daily':
        $start_date = $end_date = date('Y-m-d');
        break;
    case 'monthly':
        $start_date = date('Y-m-01');
        $end_date = date('Y-m-t');
        break;
case 'custom':
    if (empty($from) || empty($to)) {
        die('Please select a valid start and end date for custom range.');
    }

    $start_date = $from;
    $end_date   = $to;
    break;

    default:
        $start_date = $end_date = date('Y-m-d');
}

$sql = "
    SELECT
        i.id,
        i.name AS item_name,
        i.unit_price,
        i.quantity AS stock_quantity,
        MIN(c.name) AS category_name,
        COALESCE(SUM(d.quantity), 0) AS total_distributed,
        (i.quantity - COALESCE(SUM(d.quantity), 0)) AS remaining_stock,
        ((i.quantity - COALESCE(SUM(d.quantity), 0)) * i.unit_price) AS stock_value,
        MAX(d.date) AS last_distribution_date
    FROM items i
    JOIN categories c ON i.category_id = c.id
    LEFT JOIN distributions d
        ON d.item_id = i.id
        AND d.date BETWEEN :start AND :end
    WHERE 1=1
";


$params = [
    ':start' => $start_date,
    ':end' => $end_date
];

if ($category_id !== 'all') {
    $sql .= " AND i.category_id = :category";
    $params[':category'] = $category_id;
}

if ($item_id !== 'all') {
    $sql .= " AND i.id = :item";
    $params[':item'] = $item_id;
}

$sql .= " GROUP BY i.id ORDER BY i.name ASC";

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($report_type === 'pdf') {

    $pdf = new FPDF('L', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 14);

    // Title
    $pdf->Cell(0, 10, 'OVERALL ITEM REPORT', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(0, 8, "Period: $start_date to $end_date", 0, 1, 'C');
    $pdf->Ln(5);

    // Table Headers
    $pdf->SetFont('Arial', 'B', 10);
    $headers = ['Item', 'Category', 'Unit Price', 'Stock', 'Distributed', 'Remaining', 'Stock Value', 'Last Distributed'];
    $widths  = [60, 35, 20, 15, 20, 20, 25, 30];

    foreach ($headers as $i => $h) {
        $pdf->Cell($widths[$i], 8, $h, 1, 0, 'C');
    }
    $pdf->Ln(); // ✅ stays inside PDF block

    // Table Rows
    $pdf->SetFont('Arial', '', 10);
    $fill = false;
    $grand_total_value = 0;

    foreach ($results as $row) {
        $pdf->SetFillColor(240, 240, 240);

        $pdf->Cell($widths[0], 8, $row['item_name'], 1, 0, 'L', $fill);
        $pdf->Cell($widths[1], 8, $row['category_name'], 1, 0, 'L', $fill);
        $pdf->Cell($widths[2], 8, number_format($row['unit_price'], 2), 1, 0, 'R', $fill);
        $pdf->Cell($widths[3], 8, $row['stock_quantity'], 1, 0, 'R', $fill);
        $pdf->Cell($widths[4], 8, $row['total_distributed'], 1, 0, 'R', $fill);
        $pdf->Cell($widths[5], 8, $row['remaining_stock'], 1, 0, 'R', $fill);
        $pdf->Cell($widths[6], 8, number_format($row['stock_value'], 2), 1, 0, 'R', $fill);

        $lastDate = !empty($row['last_distribution_date'])
            ? date('Y-m-d', strtotime($row['last_distribution_date']))
            : 'N/A';

        $pdf->Cell($widths[7], 8, $lastDate, 1, 0, 'C', $fill);

        $pdf->Ln();
        $fill = !$fill;
        $grand_total_value += $row['stock_value'];
    }

    // Grand Total
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(array_sum(array_slice($widths, 0, 6)), 8, 'TOTAL STOCK VALUE', 1, 0, 'R');
    $pdf->Cell($widths[6], 8, number_format($grand_total_value, 2), 1, 0, 'R');
    $pdf->Ln(15);

    // Signatories
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 6, 'Prepared By: ' . $prepared_by, 0, 1, 'L');
    $pdf->Cell(0, 6, 'Reviewed By: ' . $reviewed_by, 0, 1, 'L');
    $pdf->Cell(0, 6, 'Approved By: ' . $approved_by, 0, 1, 'L');

    $pdf->Output('D', 'overall_item_report_' . date('Ymd_His') . '.pdf');
    exit;
}



if ($report_type === 'excel') {

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();

    // Set title and period
    $sheet->mergeCells('A1:H1');
    $sheet->setCellValue('A1', 'OVERALL ITEM REPORT');
    $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
    $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

    $sheet->mergeCells('A2:H2');
    $sheet->setCellValue('A2', "Period: $start_date to $end_date");
    $sheet->getStyle('A2')->getFont()->setItalic(true);
    $sheet->getStyle('A2')->getAlignment()->setHorizontal('center');

    // Table headers
    $headers = ['Item', 'Category', 'Unit Price', 'Stock', 'Distributed', 'Remaining', 'Stock Value', 'Last Distributed'];
    $sheet->fromArray($headers, null, 'A4');

    // Apply bold to headers
    $sheet->getStyle('A4:G4')->getFont()->setBold(true);
$sheet->getStyle('A4:H4')->getFont()->setBold(true);
$sheet->getStyle('A4:H4')->getBorders()->getAllBorders()
      ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
    // Start filling rows
    $rowNum = 5;
    $grand_total_value = 0;

    foreach ($results as $row) {
        $sheet->fromArray([
        $row['item_name'],
        $row['category_name'],
        $row['unit_price'],
        $row['stock_quantity'],
        $row['total_distributed'],
        $row['remaining_stock'],
        $row['stock_value'],
        $row['last_distribution_date']
    ], null, 'A' . $rowNum);


        // Borders for each row
        $sheet->getStyle('A'.$rowNum.':H'.$rowNum)
              ->getBorders()->getAllBorders()
              ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        $grand_total_value += $row['stock_value'];
        $rowNum++;
    }

    // Grand Total
    $sheet->setCellValue('F'.$rowNum, 'TOTAL STOCK VALUE');
    $sheet->setCellValue('G'.$rowNum, $grand_total_value);
    $sheet->getStyle('F'.$rowNum.':G'.$rowNum)->getFont()->setBold(true);
    $sheet->getStyle('F'.$rowNum.':G'.$rowNum)
          ->getBorders()->getAllBorders()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

    $rowNum += 3;

    // Signatories
    $sheet->setCellValue('A'.$rowNum, 'Prepared By: ' . $prepared_by);
    $sheet->setCellValue('C'.$rowNum, 'Reviewed By: ' . $reviewed_by);
    $sheet->setCellValue('E'.$rowNum, 'Approved By: ' . $approved_by);

    // Optional: bold signatories labels
    $sheet->getStyle('A'.$rowNum.':E'.$rowNum)->getFont()->setBold(true);

    // Adjust column widths for readability
        foreach (range('A','H') as $col) {
    $sheet->getColumnDimension($col)->setAutoSize(true);
}


    // Output Excel
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="overall_item_report_' . date('Ymd_His') . '.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}
