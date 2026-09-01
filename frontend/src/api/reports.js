// frontend/src/api/reports.js
// Replaces: form action="forms/generate_report.php" method="POST" target="_blank"
//
// PHP: forms POSTed to PHP file → PHP set Content-Disposition header → browser downloaded file
// React: POST with axios (blob response type) → create object URL → trigger download link

import client from './client.js';

// Generic download helper — mirrors PHP header('Content-Disposition: attachment')
async function downloadReport(endpoint, payload, filename) {
  const response = await client.post(endpoint, payload, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: response.headers['content-type'] });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

// Distributions Report — replaces: generate_report.php
export function downloadDistributionsReport(payload) {
  const ext = payload.format === 'excel' ? 'xlsx' : 'pdf';
  return downloadReport('/reports/distributions', payload, `distributions_report.${ext}`);
}

// Overall Item Report — replaces: overall_report.php
export function downloadOverallReport(payload) {
  const ext = payload.format === 'excel' ? 'xlsx' : 'pdf';
  return downloadReport('/reports/overall', payload, `overall_report.${ext}`);
}

// Department Report — replaces: department_report.php
export function downloadDepartmentReport(payload) {
  const ext = payload.format === 'excel' ? 'xlsx' : 'pdf';
  return downloadReport('/reports/department', payload, `dept_report_${payload.department}.${ext}`);
}

// Allocations Report — replaces: generate_allocation_report.php
export function downloadAllocationsReport(payload) {
  const ext = payload.format === 'excel' ? 'xlsx' : 'pdf';
  return downloadReport('/reports/allocations', payload, `allocations_report.${ext}`);
}

// TCMS Inspection Requests Report
export function downloadInspectionRequestsReport(payload) {
  const ext = payload.format === 'excel' ? 'xlsx' : 'pdf';
  return downloadReport('/reports/inspections', payload, `inspection_requests_report.${ext}`);
}
