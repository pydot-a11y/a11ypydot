"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/shared.routes.ts
const express_1 = require("express");
const shared_controller_1 = require("../controllers/shared.controller");
const router = (0, express_1.Router)();
router.get('/top-users-across-systems', shared_controller_1.getTopUsersAcrossSystems);
exports.default = router;
