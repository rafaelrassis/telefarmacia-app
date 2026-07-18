import { Router } from 'express';
import { getPublicStats } from '../controllers/PublicStatsController.js';

const router = Router();

// Estatísticas agregadas para social proof da landing — público, sem auth
router.get('/public/stats', getPublicStats);

export default router;
