"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/c4ts.routes.ts
const express_1 = require("express");
const c4ts_controller_1 = require("../controllers/c4ts.controller");
const router = (0, express_1.Router)();
router.get('/overview-stats', c4ts_controller_1.getC4TSOverviewStats);
router.get('/api-hits-by-url', c4ts_controller_1.getC4TSApiHitsByUrl);
router.get('/top-users', c4ts_controller_1.getC4TSTopUsers);
exports.default = router;
