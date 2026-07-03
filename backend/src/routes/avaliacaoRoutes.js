import { Router } from 'express';
import { avaliarConsulta, getAvaliacoesFarmaceutico, getAvaliacaoPendente } from '../controllers/AvaliacaoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/avaliacoes',                   authMiddleware, avaliarConsulta);
router.get('/paciente/avaliacao-pendente',   authMiddleware, getAvaliacaoPendente);
router.get('/farmaceuticos/:id/avaliacoes',  getAvaliacoesFarmaceutico);

export default router;
