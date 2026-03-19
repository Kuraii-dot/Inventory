// backend/routes/allocations.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../middleware/activityLogger.js';
import {
  getAllocations, getAllocationById,
  addAllocation, updateAllocation,
  deleteAllocation, returnAllocation
} from '../controllers/allocationsController.js';

const router = Router();
router.use(authenticate);

router.get('/',           getAllocations);
router.get('/:id',        getAllocationById);
router.post('/', logCreate('allocations', (req) => `New allocation for ${req.body.department} by ${req.body.allocated_by}`),          addAllocation);
router.put('/:id', logUpdate('allocations', (req) => `Updated allocation ID: ${req.params.id}`),        updateAllocation);
router.delete('/:id', logDelete('allocations', (req) => `Deleted allocation ID: ${req.params.id}`),     deleteAllocation);
router.post('/:id/return',returnAllocation);

export default router;