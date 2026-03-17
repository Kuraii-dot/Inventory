// backend/routes/distributions.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getDistributions, getDistributionById,
  addDistribution, updateDistribution,
  deleteDistribution, returnDistribution
} from '../controllers/distributionsController.js';

const router = Router();
router.use(authenticate);

router.get('/',            getDistributions);
router.get('/:id',         getDistributionById);
router.post('/',           addDistribution);
router.put('/:id',         updateDistribution);
router.delete('/:id',      deleteDistribution);
router.post('/:id/return', returnDistribution);

export default router;