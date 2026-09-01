// backend/routes/combinations.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCombinations, getCombinationById,
  createCombination, updateCombination, deleteCombination,
} from '../controllers/combinationsController.js';
import { logCreate, logDelete, logUpdate } from '../middleware/activityLogger.js';

const router = Router();
router.use(authenticate);

router.get('/',           getCombinations);
router.get('/:id',        getCombinationById);
router.post('/',          logCreate('combinations', req => `Created combination: ${req.body.combination_name}`), createCombination);
router.put('/:id',        logUpdate('combinations', req => `Updated combination ID: ${req.params.id}`), updateCombination);
router.delete('/:id',     logDelete('combinations', req => `Deactivated combination ID: ${req.params.id}`), deleteCombination);

export default router;
