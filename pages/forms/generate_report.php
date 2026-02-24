<?php
include('../../includes/db.php');

// Include libraries
require('../../vendor/autoload.php'); // PhpSpreadsheet
require('../../vendor/setasign/fpdf/fpdf.php'); // FPDF

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    // 🧾 Get form data
    $format = $_POST['format'] ?? 'pdf';
    $timeframe = $_POST['timeframe'] ?? 'today';
    $from = $_POST['from'] ?? null;
    $to = $_POST['to'] ?? null;

    // Determine date range
    $today = date('Y-m-d');
    switch ($timeframe) {
        case 'today':
            $startDate = $endDate = $today;
            break;
        case 'month':
            $startDate = date('Y-m-01');
            $endDate = date('Y-m-t');
            break;
        case 'year':
            $startDate = date('Y-01-01');
            $endDate = date('Y-12-31');
            break;
        case 'custom':
            if (!$from || !$to) throw new Exception('Please provide both From and To dates for custom range.');
            $startDate = $from;
            $endDate = $to;
            break;
        default:
            $startDate = $endDate = $today;
    }

    // Fetch distributions from DB including approved_by
    $stmt = $conn->prepare("
        SELECT d.distributed_at, d.quantity, d.total_value, d.recipient, d.department, 
               i.name AS item, c.name AS category, d.approved_by
        FROM distributions d
        JOIN items i ON d.item_id = i.id
        JOIN categories c ON d.category_id = c.id
        WHERE d.distributed_at BETWEEN :start AND :end
        ORDER BY d.distributed_at ASC
    ");
    $stmt->execute([
        ':start' => $startDate . ' 00:00:00',
        ':end' => $endDate . ' 23:59:59'
    ]);
    $distributions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($format === 'excel') {
        // 🟢 Excel Export
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Distributions Report');

        $headers = ['Date/Time', 'Item', 'Category', 'Recipient', 'Department', 'Quantity', 'Total Value', 'Approved By'];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($distributions as $dist) {
            $sheet->setCellValue("A$row", $dist['distributed_at']);
            $sheet->setCellValue("B$row", $dist['item']);
            $sheet->setCellValue("C$row", $dist['category']);
            $sheet->setCellValue("D$row", $dist['recipient']);
            $sheet->setCellValue("E$row", $dist['department']);
            $sheet->setCellValue("F$row", $dist['quantity']);
            $sheet->setCellValue("G$row", number_format($dist['total_value'], 2));
            $sheet->setCellValue("H$row", $dist['approved_by']);
            $row++;
        }

        // Auto width columns
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = "Distributions_Report_" . date('Ymd_His') . ".xlsx";
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    } else {
        // 🟢 PDF Export with FPDF
        class PDFWrap extends FPDF {
            function NbLines($w, $txt) {
                $cw = &$this->CurrentFont['cw'];
                if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
                $wmax = ($w - 2 * $this->cMargin) * 1000 / $this->FontSize;
                $s = str_replace("\r", '', $txt);
                $nb = strlen($s);
                if ($nb > 0 && $s[$nb - 1] == "\n") $nb--;
                $sep = -1; $i = 0; $j = 0; $l = 0; $nl = 1;
                while ($i < $nb) {
                    $c = $s[$i];
                    if ($c == "\n") { $i++; $sep=-1; $j=$i; $l=0; $nl++; continue; }
                    if ($c==' ') $sep=$i;
                    $l += $cw[$c];
                    if ($l > $wmax) {
                        if ($sep == -1) { if ($i==$j) $i++; } else $i = $sep + 1;
                        $sep=-1; $j=$i; $l=0; $nl++;
                    } else $i++;
                }
                return $nl;
            }

            function CheckPageBreak($h) {
                if($this->GetY() + $h > $this->PageBreakTrigger) $this->AddPage($this->CurOrientation);
            }
        }

        $pdf = new PDFWrap('L','mm','A4');
        $pdf->SetMargins(10,10,10);
        $pdf->AddPage();

        // Header
        $pdf->SetFont('Arial','B',20);
        $pdf->Cell(0,10,'Distributions Report',0,1,'C');
        $pdf->SetFont('Arial','',12);
        $pdf->Ln(3);
        $pdf->Cell(0,6,"Period: $startDate to $endDate",0,1,'C');
        $pdf->Ln(5);

        $widths = [30,40,30,40,30,20,25,35]; // include Approved By
        $headers = ['Date/Time','Item','Category','Recipient','Department','Qty','Total Value','Approved By'];

        // Table header
        $pdf->SetFont('Arial','B',10);
        $pdf->SetFillColor(70,130,180);
        $pdf->SetTextColor(255,255,255);
        for($i=0;$i<count($headers);$i++) {
            $pdf->Cell($widths[$i],8,$headers[$i],1,0,'C',true);
        }
        $pdf->Ln();

        $pdf->SetTextColor(0,0,0);
        $pdf->SetFont('Arial','',10);
        $totalValueSum = 0;
        $fill = false;

        foreach($distributions as $dist) {
            $rowData = [
                date('M d, Y g:i A', strtotime($dist['distributed_at'])),
                $dist['item'],
                $dist['category'],
                $dist['recipient'],
                $dist['department'],
                $dist['quantity'],
                number_format($dist['total_value'],2),
                $dist['approved_by']
            ];

            // alternating fill
            $pdf->SetFillColor($fill?240:255,$fill?240:255,$fill?240:255);

            // Calculate row height
            $nb=0;
            for($i=0;$i<count($rowData);$i++) $nb=max($nb,$pdf->NbLines($widths[$i],$rowData[$i]));
            $h=5*$nb;
            $pdf->CheckPageBreak($h);

            // Draw cells
            $x=$pdf->GetX(); $y=$pdf->GetY();
            for($i=0;$i<count($rowData);$i++){
                $w=$widths[$i];
                $align=($i==5||$i==6)?'C':'L';
                $pdf->Rect($x,$y,$w,$h,'FD');
                $pdf->SetXY($x,$y);
                if($i==5||$i==6) $pdf->Cell($w,5,$rowData[$i],0,0,'C');
                else $pdf->MultiCell($w,5,$rowData[$i],0,$align);
                $x+=$w;
            }
            $pdf->SetXY($pdf->GetX(),$y+$h);
            $pdf->Ln(0);
            $totalValueSum += $dist['total_value'];
            $fill = !$fill;
        }

        // Total row
        $pdf->SetFont('Arial','B',10);
        $pdf->SetFillColor(70,130,180);
        $pdf->SetTextColor(255,255,255);
        $totalWidth=array_sum($widths)-$widths[6]-$widths[7];
        $pdf->Cell($totalWidth,8,'TOTAL VALUE',1,0,'R',true);
        $pdf->Cell($widths[6]+$widths[7],8,'Php'.number_format($totalValueSum,2),1,0,'C',true);
        $pdf->Ln();

        // Footer
        $pdf->SetFont('Arial','I',8);
        $pdf->SetTextColor(100,100,100);
        $pdf->Ln(5);
        $pdf->Cell(0,5,'Generated on: '.date('F d, Y g:i A'),0,1,'C');
        $pdf->Cell(0,5,'CCWD Inventory Management System',0,1,'C');

        $filename = "Distributions_Report_".date('Ymd_His').".pdf";
        $pdf->Output('D',$filename);
        exit;
    }

} catch(Exception $e){
    echo "Error generating report: ".$e->getMessage();
}
?>
