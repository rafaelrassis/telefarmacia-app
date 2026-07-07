import { Router } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe } from '../controllers/PushController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/push/vapid-public-key',  getVapidPublicKey);
router.post('/push/subscribe',        authMiddleware, subscribe);
router.delete('/push/subscribe',      authMiddleware, unsubscribe);

export default router;
