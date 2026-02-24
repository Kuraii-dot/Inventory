<?php
require_once '../../vendor/autoload.php';
use Dompdf\Dompdf;

function generatePDF($rows) {
  $dompdf = new Dompdf();
  $html = '<h2 style="text-align:center;">Distribution Report</h2>';
  $html .= '<table border="1" cellspacing="0" cellpadding="6" width="100%">';
  $html .= '<thead><tr>
    <th>Date</th><th>Item</th><th>Quantity</th><th>Total Value</th>
    <th>Category</th><th>Department</th><th>Recipient</th><th>Purpose</th><th>Approved By</th>
  </tr></thead><tbody>';
  foreach ($rows as $r) {
    $html .= "<tr>
      <td>".date('M d, Y', strtotime($r['distributed_at']))."</td>
      <td>{$r['item_name']}</td>
      <td>{$r['quantity']}</td>
      <td>₱".number_format($r['total_value'], 2)."</td>
      <td>{$r['category_name']}</td>
      <td>{$r['department']}</td>
      <td>{$r['recipient']}</td>
      <td>{$r['purpose']}</td>
      <td>{$r['approved_by']}</td>
    </tr>";
  }
  $html .= '</tbody></table>';

  $dompdf->loadHtml($html);
  $dompdf->setPaper('A4', 'landscape');
  $dompdf->render();
  $dompdf->stream("distribution_report.pdf", ["Attachment" => true]);
}
?>
