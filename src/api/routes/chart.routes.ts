import { Router } from 'express';
import { getSessionStartChart, getSessionEndChart } from '../controllers/chart.controller';
import { adminOnly } from '../../middlewares/adminOnly';
import { verifyJWT } from '../../middlewares/authMiddleware';

const router = Router();

// /admin/charts/session?date=2025-01-01&enddate=2025-01-10
router.get('/session/start', verifyJWT, adminOnly, getSessionStartChart);
router.get('/session/end', verifyJWT, adminOnly, getSessionEndChart);

export default router;
