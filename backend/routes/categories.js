// backend/routes/categories.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../controllers/categoriesController.js';
import { logCreate, logDelete, logUpdate } from '../middleware/activityLogger.js';

const router = Router();
router.use(authenticate);

router.get('/',       getCategories);
router.post('/',      logCreate('categories', req => `Added category: ${req.body.name}`), addCategory);
router.put('/:id',    logUpdate('categories', req => `Updated category ID: ${req.params.id}`), updateCategory);
router.delete('/:id', logDelete('categories', req => `Deleted category ID: ${req.params.id}`), deleteCategory);

export default router;
