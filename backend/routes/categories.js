// backend/routes/categories.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../controllers/categoriesController.js';

const router = Router();
router.use(authenticate);

router.get('/',       getCategories);
router.post('/',      addCategory);
router.put('/:id',    updateCategory);
router.delete('/:id', deleteCategory);

export default router;