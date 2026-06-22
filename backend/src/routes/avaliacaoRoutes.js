import { Router } from 'express';
import { avaliarConsulta, getAvaliacoesFarmaceutico } from '../controllers/AvaliacaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/avaliacoes',                          authMiddleware, avaliarConsulta);
router.get('/farmaceuticos/:id/avaliacoes',         getAvaliacoesFarmaceutico);

export default router;
