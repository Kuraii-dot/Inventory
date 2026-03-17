// backend/routes/dashboard.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardData } from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate);

router.get('/', getDashboardData);

export default router;