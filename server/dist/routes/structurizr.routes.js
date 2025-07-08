"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/structurizr.routes.ts
const express_1 = require("express");
const structurizr_controller_1 = require("../controllers/structurizr.controller");
const router = (0, express_1.Router)();
router.get('/overview-stats', structurizr_controller_1.getStructurizrOverviewStats);
router.get('/workspaces-by-status', structurizr_controller_1.getStructurizrWorkspacesByStatus);
router.get('/access-methods', structurizr_controller_1.getStructurizrAccessMethods); // Stub
router.get('/top-users', structurizr_controller_1.getStructurizrTopUsers); // Stub
exports.default = router;
