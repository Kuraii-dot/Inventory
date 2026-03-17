// backend/routes/items.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getItems, getAllItemsOverview, getItemsByCategory, getItemsByClassification,
  addItem, getItemById, updateItem, deleteItem, validateStock
} from '../controllers/itemsController.js';

const router = Router();
router.use(authenticate); // all item routes require login

router.get('/validate-stock',     validateStock);          // before /:id to avoid conflict
router.get('/by-category',        getItemsByCategory);
router.get('/by-classification',  getItemsByClassification);
router.get('/all-overview',       getAllItemsOverview);
router.get('/',                   getItems);
router.post('/',                  addItem);
router.get('/:id',                getItemById);
router.put('/:id',                updateItem);
router.delete('/:id',             deleteItem);

export default router;