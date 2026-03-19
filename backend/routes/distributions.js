// backend/routes/distributions.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../middleware/activityLogger.js';
import {
  getDistributions, getDistributionById,
  addDistribution, updateDistribution,
  deleteDistribution, returnDistribution
} from '../controllers/distributionsController.js';

const router = Router();
router.use(authenticate);

router.get('/',            getDistributions);
router.get('/:id',         getDistributionById);
router.post('/', logCreate('distributions', (req) => `New distribution to ${req.body.recipient} - ${req.body.department}`),           addDistribution);
router.put('/:id', logUpdate('distributions', (req) => `Updated distribution ID: ${req.params.id}`),         updateDistribution);
router.delete('/:id', logDelete('distributions', (req) => `Deleted distribution ID: ${req.params.id}`),      deleteDistribution);
router.post('/:id/return', returnDistribution);

export default router;