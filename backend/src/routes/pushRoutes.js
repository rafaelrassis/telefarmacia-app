import { Router } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe, sendTestPush } from '../controllers/PushController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/push/vapid-public-key',  getVapidPublicKey);
router.post('/push/subscribe',        authMiddleware, subscribe);
router.delete('/push/subscribe',      authMiddleware, unsubscribe);
router.post('/push/test',             authMiddleware, sendTestPush);

export default router;
