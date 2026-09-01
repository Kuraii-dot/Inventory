// backend/routes/reports.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  distributionsReport,
  overallReport,
  departmentReport,
  allocationsReport,
  inventoryReport,
  inventoryPreview,
  inspectionRequestsReport,
} from '../controllers/reportsController.js';

const router = Router();
router.use(authenticate);

// POST /api/reports/distributions   ← generate_report.php
router.post('/distributions', distributionsReport);

// POST /api/reports/overall         ← overall_report.php
router.post('/overall', overallReport);

// POST /api/reports/department      ← department_report.php
router.post('/department', departmentReport);

// POST /api/reports/allocations     ← generate_allocation_report.php
router.post('/allocations', allocationsReport);

// GET /api/reports/inventory
router.get('/inventory', inventoryReport);

// GET /api/reports/inventory-preview
router.get('/inventory-preview', inventoryPreview);

// POST /api/reports/inspections
router.post('/inspections', inspectionRequestsReport);

export default router;
