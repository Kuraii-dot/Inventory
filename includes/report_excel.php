<?php
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

function generateExcel($rows) {
  $spreadsheet = new Spreadsheet();
  $sheet = $spreadsheet->getActiveSheet();

  $headers = ['Date', 'Item', 'Quantity', 'Total Value', 'Category', 'Department', 'Recipient', 'Purpose', 'Approved By'];
  $sheet->fromArray($headers, NULL, 'A1');
  
  $data = [];
  foreach ($rows as $r) {
    $data[] = [
      date('M d, Y', strtotime($r['distributed_at'])),
      $r['item_name'],
      $r['quantity'],
      $r['total_value'],
      $r['category_name'],
      $r['department'],
      $r['recipient'],
      $r['purpose'],
      $r['approved_by']
    ];
  }
  $sheet->fromArray($data, NULL, 'A2');

  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  header('Content-Disposition: attachment; filename="distribution_report.xlsx"');
  $writer = new Xlsx($spreadsheet);
  $writer->save('php://output');
}
?>
