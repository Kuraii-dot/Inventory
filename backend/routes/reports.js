// backend/routes/reports.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  distributionsReport,
  overallReport,
  departmentReport,
  allocationsReport,
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

export default router;