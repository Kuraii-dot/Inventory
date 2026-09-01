import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logUpdate } from '../middleware/activityLogger.js';
import {
  getInspectionRequestCatalog,
  getInspectionRequests,
  getInspectionRequestById,
  updateInspectionPreparation,
  releaseInspectionMaterials,
} from '../controllers/inspectionRequestsController.js';

const router = Router();
router.use(authenticate);
router.get('/catalog/materials', getInspectionRequestCatalog);
router.get('/', getInspectionRequests);
router.get('/:id', getInspectionRequestById);
router.put(
  '/:id/preparation',
  logUpdate('inspection_requests', (req) => `Updated prepared materials for inspection request ${req.params.id}`),
  updateInspectionPreparation
);
router.post(
  '/:id/release',
  logUpdate('inspection_requests', (req) => `Released materials for inspection request ${req.params.id}`),
  releaseInspectionMaterials
);

export default router;
