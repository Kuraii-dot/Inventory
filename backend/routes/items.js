// backend/routes/items.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../middleware/activityLogger.js';
import {
  getItems, getAllItemsOverview, getItemsByCategory, getItemsByClassification,
  addItem, getItemById, updateItem, deleteItem, restoreItem, validateStock
} from '../controllers/itemsController.js';

const router = Router();
router.use(authenticate); // all item routes require login

router.get('/validate-stock',     validateStock);          // before /:id to avoid conflict
router.get('/by-category',        getItemsByCategory);
router.get('/by-classification',  getItemsByClassification);
router.get('/all-overview',       getAllItemsOverview);
router.get('/',                   getItems);
router.post('/', logCreate('items', (req, data) => `Added item: ${req.body.name} (qty: ${req.body.quantity})`), addItem);
router.get('/:id',                getItemById);
router.put('/:id', logUpdate('items', (req) => `Updated item ID: ${req.params.id}`), updateItem);
router.delete('/:id', logDelete('items', (req) => `Deleted item ID: ${req.params.id}`), deleteItem);
router.put('/:id/restore', restoreItem);

export default router;