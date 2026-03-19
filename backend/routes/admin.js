// backend/routes/admin.js
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getActivityLog, getItemMovement, exportItemMovement,
  getUserReport, getAdminStats,
} from '../controllers/adminController.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('master_admin'));

router.get('/stats',              getAdminStats);
router.get('/activity',           getActivityLog);
router.get('/item-movement',        getItemMovement);
router.get('/item-movement/export', exportItemMovement);
router.get('/user-report/:user_id', getUserReport);

export default router;