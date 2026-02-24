<?php
include('../../includes/db.php');

require('../../vendor/autoload.php');
require('../../vendor/setasign/fpdf/fpdf.php');

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

try {
    // Accept both GET (window.open) and POST
    $format = $_GET['format'] ?? $_POST['format'] ?? 'pdf';
    $itemId = (int) ($_GET['item_id'] ?? $_POST['item_id'] ?? 0);

    if (!$itemId) throw new Exception('Item ID is required.');

    // ── Item details ──────────────────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT i.id, i.name, i.quantity AS current_stock,
               c.name AS category,
               cl.classification_name AS classification
        FROM items i
        LEFT JOIN categories      c  ON c.id  = i.category_id
        LEFT JOIN classifications cl ON cl.id = i.classification_id
        WHERE i.id = :item_id
    ");
    $stmt->execute([':item_id' => $itemId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$item) throw new Exception('Item not found.');

    $transactions = [];

    // ── Procurement ───────────────────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT i.created_at AS date, 'Procurement' AS type,
               CONCAT('INV-', i.id) AS reference, i.quantity,
               CONCAT('Procured from ', COALESCE(s.name, 'Unknown Supplier')) AS details
        FROM items i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.id = :item_id
    ");
    $stmt->execute([':item_id' => $itemId]);
    $proc = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($proc) $transactions[] = $proc;

    // ── Distributions ─────────────────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT d.distributed_at AS date, 'Distribution' AS type,
               CONCAT('DIST-', d.id) AS reference, d.quantity,
               CONCAT('To ', COALESCE(d.department,''), ' - ', COALESCE(d.recipient,'')) AS details
        FROM distributions d
        WHERE d.item_id = :item_id AND d.quantity > 0
        ORDER BY d.distributed_at ASC
    ");
    $stmt->execute([':item_id' => $itemId]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) $transactions[] = $row;

    // ── Allocations ───────────────────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT a.allocated_at AS date, 'Allocation' AS type,
               CONCAT('ALLOC-', a.id) AS reference, a.quantity,
               CONCAT('To ', COALESCE(a.department,'')) AS details
        FROM allocations a
        WHERE a.item_id = :item_id AND a.quantity > 0
        ORDER BY a.allocated_at ASC
    ");
    $stmt->execute([':item_id' => $itemId]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) $transactions[] = $row;

    // ── Returns from distributions ────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT d.distributed_at AS date, 'Return' AS type,
               CONCAT('RET-DIST-', d.id) AS reference, ABS(d.quantity) AS quantity,
               CONCAT('Returned from ', COALESCE(d.department,''), ' - ', COALESCE(d.recipient,'')) AS details
        FROM distributions d
        WHERE d.item_id = :item_id AND d.quantity < 0
        ORDER BY d.distributed_at ASC
    ");
    $stmt->execute([':item_id' => $itemId]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) $transactions[] = $row;

    // ── Returns from allocations ──────────────────────────────────────
    $stmt = $conn->prepare("
        SELECT a.allocated_at AS date, 'Return' AS type,
               CONCAT('RET-ALLOC-', a.id) AS reference, ABS(a.quantity) AS quantity,
               CONCAT('Returned from ', COALESCE(a.department,'')) AS details
        FROM allocations a
        WHERE a.item_id = :item_id AND a.quantity < 0
        ORDER BY a.allocated_at ASC
    ");
    $stmt->execute([':item_id' => $itemId]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) $transactions[] = $row;

    // ── Sort & running balance ────────────────────────────────────────
    usort($transactions, fn($a, $b) => strtotime($a['date']) - strtotime($b['date']));

    $balance = 0;
    foreach ($transactions as &$tx) {
        if ($tx['type'] === 'Procurement' || $tx['type'] === 'Return') {
            $balance += $tx['quantity'];
        } else {
            $balance -= $tx['quantity'];
        }
        $tx['balance'] = $balance;
    }
    unset($tx);

    // ── Totals ────────────────────────────────────────────────────────
    $totalProcured = $totalDistributed = $totalAllocated = $totalReturned = 0;
    foreach ($transactions as $tx) {
        match ($tx['type']) {
            'Procurement'  => $totalProcured    += $tx['quantity'],
            'Distribution' => $totalDistributed += $tx['quantity'],
            'Allocation'   => $totalAllocated   += $tx['quantity'],
            'Return'       => $totalReturned    += $tx['quantity'],
            default        => null,
        };
    }

    // ════════════════════════════════════════════════
    // EXCEL
    // ════════════════════════════════════════════════
    if ($format === 'excel') {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Item Ledger');

        $sheet->fromArray([
            ['Item Name',       $item['name']],
            ['Category',        $item['category']       ?? 'N/A'],
            ['Classification',  $item['classification'] ?? 'N/A'],
            ['Current Stock',   $item['current_stock']],
        ], null, 'A1');

        $sheet->fromArray(['Date','Type','Reference','Quantity','Balance','Details'], null, 'A6');

        $r = 7;
        foreach ($transactions as $tx) {
            $qty = ($tx['type'] === 'Distribution' || $tx['type'] === 'Allocation')
                 ? '-' . $tx['quantity'] : '+' . $tx['quantity'];
            $sheet->fromArray([
                date('Y-m-d H:i', strtotime($tx['date'])),
                $tx['type'],
                $tx['reference'],
                $qty,
                $tx['balance'],
                $tx['details'],
            ], null, "A$r");
            $r++;
        }

        $r++;
        $sheet->fromArray([
            ['Summary'],
            ['Total Procured',    $totalProcured],
            ['Total Distributed', $totalDistributed],
            ['Total Allocated',   $totalAllocated],
            ['Total Returned',    $totalReturned],
            ['Current Balance',   $item['current_stock']],
        ], null, "A$r");

        foreach (range('A','F') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);

        $filename = 'Item_Ledger_' . date('Ymd_His') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"$filename\"");
        header('Cache-Control: max-age=0');
        (new Xlsx($spreadsheet))->save('php://output');
        exit;
    }

    // ════════════════════════════════════════════════
    // PDF
    // ════════════════════════════════════════════════
    class PDFWrap extends FPDF {
        function NbLines($w, $txt) {
            $cw = &$this->CurrentFont['cw'];
            if ($w == 0) $w = $this->w - $this->rMargin - $this->x;
            $wmax = ($w - 2 * $this->cMargin) * 1000 / $this->FontSize;
            $s = str_replace("\r", '', $txt);
            $nb = strlen($s);
            if ($nb > 0 && $s[$nb-1] == "\n") $nb--;
            $sep = -1; $i = 0; $j = 0; $l = 0; $nl = 1;
            while ($i < $nb) {
                $c = $s[$i];
                if ($c == "\n") { $i++; $sep = -1; $j = $i; $l = 0; $nl++; continue; }
                if ($c == ' ') $sep = $i;
                $l += $cw[$c];
                if ($l > $wmax) {
                    if ($sep == -1) { if ($i == $j) $i++; } else $i = $sep + 1;
                    $sep = -1; $j = $i; $l = 0; $nl++;
                } else $i++;
            }
            return $nl;
        }
        function CheckPageBreak($h) {
            if ($this->GetY() + $h > $this->PageBreakTrigger) $this->AddPage($this->CurOrientation);
        }
    }

    $pdf = new PDFWrap('L', 'mm', 'A4');
    $pdf->SetMargins(10, 10, 10);
    $pdf->AddPage();

    $pdf->SetFont('Arial', 'B', 16);
    $pdf->Cell(0, 10, 'ITEM LEDGER REPORT', 0, 1, 'C');

    $pdf->SetFont('Arial', '', 12);
    $pdf->Cell(0, 6, 'Item: ' . $item['name'], 0, 1);
    $pdf->Cell(0, 6, 'Category: ' . ($item['category'] ?? 'N/A') . '  |  Classification: ' . ($item['classification'] ?? 'N/A'), 0, 1);
    $pdf->Cell(0, 6, 'Current Stock: ' . $item['current_stock'], 0, 1);
    $pdf->Ln(5);

    $headers = ['Date', 'Type', 'Reference', 'Quantity', 'Balance', 'Details'];
    $widths  = [40, 30, 35, 25, 25, 100];

    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetFillColor(70, 130, 180);
    $pdf->SetTextColor(255, 255, 255);
    for ($i = 0; $i < count($headers); $i++) $pdf->Cell($widths[$i], 8, $headers[$i], 1, 0, 'C', true);
    $pdf->Ln();

    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', '', 10);

    foreach ($transactions as $tx) {
        $qty = ($tx['type'] === 'Distribution' || $tx['type'] === 'Allocation')
             ? '-' . $tx['quantity'] : '+' . $tx['quantity'];

        $rowData = [
            date('M d, Y H:i', strtotime($tx['date'])),
            $tx['type'],
            $tx['reference'],
            $qty,
            $tx['balance'],
            $tx['details'],
        ];

        $nb = 0;
        for ($i = 0; $i < count($rowData); $i++) $nb = max($nb, $pdf->NbLines($widths[$i], $rowData[$i]));
        $h = 5 * $nb;
        $pdf->CheckPageBreak($h);

        $x = $pdf->GetX();
        $y = $pdf->GetY();
        for ($i = 0; $i < count($rowData); $i++) {
            $align = ($i == 3 || $i == 4) ? 'C' : 'L';
            $pdf->SetXY($x, $y);
            if ($i == 3 || $i == 4) {
                $pdf->Cell($widths[$i], $h, $rowData[$i], 1, 0, 'C');
            } else {
                $pdf->MultiCell($widths[$i], 5, $rowData[$i], 1, $align);
            }
            $x += $widths[$i];
        }
        $pdf->SetXY(10, $y + $h);
    }

    $pdf->Ln(5);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, 'Summary:', 0, 1);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(60, 6, 'Total Procured: '    . $totalProcured,    0, 0);
    $pdf->Cell(60, 6, 'Total Distributed: ' . $totalDistributed, 0, 0);
    $pdf->Cell(60, 6, 'Total Allocated: '   . $totalAllocated,   0, 0);
    $pdf->Cell(60, 6, 'Total Returned: '    . $totalReturned,    0, 1);
    $pdf->Cell(60, 6, 'Current Balance: '   . $item['current_stock'], 0, 1);

    $pdf->Output('D', 'Item_Ledger_' . date('Ymd_His') . '.pdf');
    exit;

} catch (Exception $e) {
    echo 'Error generating ledger: ' . $e->getMessage();
}