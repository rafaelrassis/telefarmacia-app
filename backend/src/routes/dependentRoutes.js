import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  listDependentes,
  createDependente,
  updateDependente,
  deleteDependente,
  getDadosSaude,
  saveDadosSaude,
} from '../controllers/DependentController.js';

const router = Router();

router.get('/dependentes',              authMiddleware, listDependentes);
router.post('/dependentes',             authMiddleware, createDependente);
router.patch('/dependentes/:id',        authMiddleware, updateDependente);
router.delete('/dependentes/:id',       authMiddleware, deleteDependente);
router.get('/dependentes/:id/saude',    authMiddleware, getDadosSaude);
router.patch('/dependentes/:id/saude',  authMiddleware, saveDadosSaude);

export default router;
