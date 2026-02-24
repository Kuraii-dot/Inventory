<?php
include('../../includes/db.php');

// Libraries
require('../../vendor/autoload.php');
require('../../vendor/setasign/fpdf/fpdf.php');
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

// ------------------ Grab POST Data ------------------
$department   = $_POST['department'] ?? '';
$timeframe    = $_POST['timeframe'] ?? 'daily';
$from         = $_POST['from'] ?? null;
$to           = $_POST['to'] ?? null;
$report_type  = strtolower($_POST['report_type'] ?? 'pdf');

if (!$department) die("Please select a department.");
if (!in_array($report_type, ['pdf', 'excel'])) die("Invalid report type.");

// ------------------ Determine Date Range ------------------
switch ($timeframe) {
    case 'daily': $start_date = $end_date = date('Y-m-d'); break;
    case 'monthly': $start_date = date('Y-m-01'); $end_date = date('Y-m-t'); break;
    case 'custom':
        if (!$from || !$to) die('Please select a valid start and end date.');
        $start_date = $from; $end_date = $to;
        break;
    default: $start_date = $end_date = date('Y-m-d');
}

// ------------------ Fetch Data ------------------
$sql = "
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
WHERE d.department = :department
  AND d.date BETWEEN :start AND :end
GROUP BY d.department, c.name, i.name, i.unit_price
ORDER BY c.name, i.name
";

$stmt = $conn->prepare($sql);
$stmt->execute([':department' => $department, ':start' => $start_date, ':end' => $end_date]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Calculate grand total
$grand_total = 0;
foreach ($results as $row) {
    $grand_total += $row['dept_value'];
}

// ------------------ PDF Generation ------------------
if ($report_type === 'pdf') {

    class PDF extends FPDF {
        function Header() {
            $this->SetFont('Arial','B',14);
            $this->Cell(0,10,'DEPARTMENT DISTRIBUTION REPORT',0,1,'C');
            $this->Ln(2);
        }
        function Footer() {
            $this->SetY(-15);
            $this->SetFont('Arial','I',8);
            $this->Cell(0,10,'Page '.$this->PageNo().'/{nb}',0,0,'C');
        }
    }

    $pdf = new PDF('L','mm','A4');
    $pdf->AliasNbPages();
    $pdf->AddPage();

    // Department & Period
    $pdf->SetFont('Arial','',11);
    $pdf->Cell(0,8,'Department: '.strtoupper($department),0,1,'C');
    $pdf->Cell(0,8,"Period: $start_date to $end_date",0,1,'C');
    $pdf->Ln(5);

    // Table headers
    $headers = ['Category','Item','Unit Price','Qty Distributed','Total Value','Last Distributed'];
    $widths = [40,70,25,25,30,30];
    $pdf->SetFont('Arial','B',10);
    foreach($headers as $i => $h) $pdf->Cell($widths[$i],8,$h,1,0,'C');
    $pdf->Ln();

    // Table rows
    $pdf->SetFont('Arial','',10);
    $current_category = '';
    $fill = false;

    foreach($results as $row) {
        // Category group header
        if($current_category !== $row['category_name']){
            $current_category = $row['category_name'];
            $pdf->SetFont('Arial','B',10);
            $pdf->Cell(array_sum($widths),8,"Category: $current_category",1,1,'L',true);
            $pdf->SetFont('Arial','',10);
            $fill = false;
        }

        $pdf->SetFillColor(240,240,240);
        $pdf->Cell($widths[0],8,$row['category_name'],1,0,'L',$fill);
        $pdf->Cell($widths[1],8,$row['item_name'],1,0,'L',$fill);
        $pdf->Cell($widths[2],8,number_format($row['unit_price'],2),1,0,'R',$fill);
        $pdf->Cell($widths[3],8,$row['dept_distributed'],1,0,'R',$fill);
        $pdf->Cell($widths[4],8,number_format($row['dept_value'],2),1,0,'R',$fill);

        $lastDate = !empty($row['last_distribution_date']) ? date('Y-m-d', strtotime($row['last_distribution_date'])) : 'N/A';
        $pdf->Cell($widths[5],8,$lastDate,1,0,'C',$fill);

        $pdf->Ln();
        $fill = !$fill;
    }

    // Grand Total
    $pdf->Ln(3);
    $pdf->SetFont('Arial','B',12);
    $pdf->Cell(array_sum($widths)-30,8,'GRAND TOTAL',1,0,'R',true);
    $pdf->Cell(30,8,number_format($grand_total,2),1,1,'R',true);

    $pdf->Output('D','department_report_'.$department.'_'.date('Ymd_His').'.pdf');
    exit;
}

// ------------------ Excel Generation ------------------
if ($report_type === 'excel') {

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Department Report');

    // Title
    $sheet->mergeCells('A1:F1');
    $sheet->setCellValue('A1','DEPARTMENT DISTRIBUTION REPORT');
    $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
    $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

    // Department & period
    $sheet->mergeCells('A2:F2');
    $sheet->setCellValue('A2','Department: '.strtoupper($department).'   Period: '.$start_date.' to '.$end_date);
    $sheet->getStyle('A2')->getAlignment()->setHorizontal('center');

    // Headers
    $headers = ['Category','Item','Unit Price','Qty Distributed','Total Value','Last Distributed'];
    $sheet->fromArray($headers, null, 'A4');
    $sheet->getStyle('A4:F4')->getFont()->setBold(true);

    // Freeze header
    $sheet->freezePane('A5');

    $rowNum = 5;
    $current_category = '';
    foreach ($results as $row) {
        if ($current_category !== $row['category_name']) {
            $current_category = $row['category_name'];
            $sheet->setCellValue('A'.$rowNum,'Category: '.$current_category);
            $sheet->getStyle('A'.$rowNum)->getFont()->setBold(true);
            $rowNum++;
        }

        $sheet->setCellValue('A'.$rowNum,$row['category_name']);
        $sheet->setCellValue('B'.$rowNum,$row['item_name']);
        $sheet->setCellValue('C'.$rowNum,$row['unit_price']);
        $sheet->setCellValue('D'.$rowNum,$row['dept_distributed']);
        $sheet->setCellValue('E'.$rowNum,$row['dept_value']);

        $lastDate = !empty($row['last_distribution_date']) ? date('Y-m-d', strtotime($row['last_distribution_date'])) : 'N/A';
        $sheet->setCellValue('F'.$rowNum, $lastDate);

        $rowNum++;
    }

    // Grand total row
    $sheet->setCellValue('D'.$rowNum,'GRAND TOTAL');
    $sheet->setCellValue('E'.$rowNum,$grand_total);
    $sheet->getStyle('D'.$rowNum.':E'.$rowNum)->getFont()->setBold(true);

    // Auto column width
    foreach(range('A','F') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    $writer = new Xlsx($spreadsheet);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="department_report_'.$department.'_'.date('Ymd_His').'.xlsx"');
    header('Cache-Control: max-age=0');
    $writer->save('php://output');
    exit;
}
