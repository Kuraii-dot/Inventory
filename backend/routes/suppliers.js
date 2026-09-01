// backend/routes/suppliers.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../controllers/suppliersController.js';
import { logCreate, logDelete, logUpdate } from '../middleware/activityLogger.js';

const router = Router();
router.use(authenticate);

router.get('/',      getSuppliers);
router.post('/',     logCreate('suppliers', req => `Added supplier: ${req.body.name}`), addSupplier);
router.put('/:id',   logUpdate('suppliers', req => `Updated supplier ID: ${req.params.id}`), updateSupplier);
router.delete('/:id',logDelete('suppliers', req => `Deleted supplier ID: ${req.params.id}`), deleteSupplier);

export default router;
