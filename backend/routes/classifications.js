// backend/routes/classifications.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getClassifications, addClassification } from '../controllers/classificationsController.js';
import pool from '../db/pool.js';
import { logCreate, logDelete, logUpdate } from '../middleware/activityLogger.js';

const router = Router();
router.use(authenticate);

router.get('/',  getClassifications);
router.post('/', logCreate('classifications', req => `Added classification: ${req.body.classification_name}`), addClassification);

// PUT /api/classifications/:id — update classification name
router.put('/:id', logUpdate('classifications', req => `Updated classification ID: ${req.params.id}`), async (req, res) => {
  const { id } = req.params;
  const { classification_name } = req.body;
  if (!classification_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Name is required.' });
  }
  try {
    await pool.query('UPDATE classifications SET classification_name = $1 WHERE id = $2', [classification_name.trim(), id]);
    res.json({ status: 'success', message: 'Classification updated.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/classifications/:id
router.delete('/:id', logDelete('classifications', req => `Deleted classification ID: ${req.params.id}`), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM classifications WHERE id = $1', [id]);
    res.json({ status: 'success', message: 'Classification deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Cannot delete: may be in use by items.' });
  }
});

export default router;
