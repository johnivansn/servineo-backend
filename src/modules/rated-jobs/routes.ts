import { Router } from 'express';
import { getRatedJobs, getRatedJobsByUser } from './controller';

const router = Router();

// Endpoint: GET /api/rated-jobs
router.get('/', getRatedJobs);
router.get('/user/:userId', getRatedJobsByUser);

export default router;
