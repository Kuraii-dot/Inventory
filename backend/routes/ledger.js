// backend/routes/ledger.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getItemLedger, exportItemLedger } from '../controllers/ledgerController.js';

const router = Router();
router.use(authenticate);

router.get('/:item_id',        getItemLedger);
router.get('/:item_id/export', exportItemLedger);

export default router;