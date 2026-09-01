// backend/routes/users.js
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/usersController.js';
import { logCreate, logDelete, logUpdate } from '../middleware/activityLogger.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('master_admin'));

router.get('/',     getUsers);
router.post('/',    logCreate('users', req => `Created user: ${req.body.username}`), createUser);
router.put('/:id',  logUpdate('users', req => `Updated user ID: ${req.params.id}`), updateUser);
router.delete('/:id', logDelete('users', req => `Deleted user ID: ${req.params.id}`), deleteUser);

export default router;
