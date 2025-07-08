// src/routes/shared.routes.ts
import { Router } from 'express';
import { getTopUsersAcrossSystems } from '../controllers/shared.controller';

const router = Router();

router.get('/top-users-across-systems', getTopUsersAcrossSystems);

export default router;