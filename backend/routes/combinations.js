// backend/routes/combinations.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCombinations, getCombinationById,
  createCombination, updateCombination, deleteCombination,
} from '../controllers/combinationsController.js';

const router = Router();
router.use(authenticate);

router.get('/',           getCombinations);
router.get('/:id',        getCombinationById);
router.post('/',          createCombination);
router.put('/:id',        updateCombination);
router.delete('/:id',     deleteCombination);

export default router;