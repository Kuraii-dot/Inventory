// backend/routes/allocations.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllocations, getAllocationById,
  addAllocation, updateAllocation,
  deleteAllocation, returnAllocation
} from '../controllers/allocationsController.js';

const router = Router();
router.use(authenticate);

router.get('/',           getAllocations);
router.get('/:id',        getAllocationById);
router.post('/',          addAllocation);
router.put('/:id',        updateAllocation);
router.delete('/:id',     deleteAllocation);
router.post('/:id/return',returnAllocation);

export default router;