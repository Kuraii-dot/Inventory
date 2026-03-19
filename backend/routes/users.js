// backend/routes/users.js
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/usersController.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('master_admin'));

router.get('/',     getUsers);
router.post('/',    createUser);
router.put('/:id',  updateUser);
router.delete('/:id', deleteUser);

export default router;