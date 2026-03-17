// backend/routes/suppliers.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../controllers/suppliersController.js';

const router = Router();
router.use(authenticate);

router.get('/',      getSuppliers);
router.post('/',     addSupplier);
router.put('/:id',   updateSupplier);
router.delete('/:id',deleteSupplier);

export default router;