import { Router } from 'express';
import { authenticateTcmsIntegration } from '../middleware/integrationAuth.js';
import {
  getIntegrationMaterials,
  getIntegrationInspectionRequest,
  upsertIntegrationInspectionRequest,
} from '../controllers/inspectionRequestsController.js';

const router = Router();
router.use(authenticateTcmsIntegration);
router.get('/tcms/materials', getIntegrationMaterials);
router.get('/tcms/inspection-requests/:submissionId', getIntegrationInspectionRequest);
router.put('/tcms/inspection-requests/:submissionId', upsertIntegrationInspectionRequest);

export default router;
