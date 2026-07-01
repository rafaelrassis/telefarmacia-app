import { Router } from 'express';
import { createUser, updatePerfil, getPerfilCompleto } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadPhoto } from '../utils/multerConfig.js';

const router = Router();

router.post('/users', createUser);
router.get('/usuario/perfil', authMiddleware, getPerfilCompleto);
router.patch('/usuario/perfil', authMiddleware, uploadPhoto, updatePerfil);

export default router;
