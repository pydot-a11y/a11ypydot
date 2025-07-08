// src/routes/structurizr.routes.ts
import { Router } from 'express';
import {
    getStructurizrOverviewStats,
    getStructurizrWorkspacesByStatus,
    getStructurizrAccessMethods,
    getStructurizrTopUsers
} from '../controllers/structurizr.controller';

const router = Router();

router.get('/overview-stats', getStructurizrOverviewStats);
router.get('/workspaces-by-status', getStructurizrWorkspacesByStatus);
router.get('/access-methods', getStructurizrAccessMethods); // Stub
router.get('/top-users', getStructurizrTopUsers); // Stub

export default router;