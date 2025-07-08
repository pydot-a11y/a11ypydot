// src/routes/c4ts.routes.ts
import { Router } from 'express';
import {
    getC4TSOverviewStats,
    getC4TSApiHitsByUrl,
    getC4TSTopUsers
} from '../controllers/c4ts.controller';

const router = Router();

router.get('/overview-stats', getC4TSOverviewStats);
router.get('/api-hits-by-url', getC4TSApiHitsByUrl);
router.get('/top-users', getC4TSTopUsers);

export default router;