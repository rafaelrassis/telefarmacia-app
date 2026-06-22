import { Router } from 'express';
import { createUser } from '../controllers/UserController.js';

const router = Router();

router.post('/users', createUser);

export default router;