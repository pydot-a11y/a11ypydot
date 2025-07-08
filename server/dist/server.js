"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
// Import routes
const structurizr_routes_1 = __importDefault(require("./routes/structurizr.routes"));
const c4ts_routes_1 = __importDefault(require("./routes/c4ts.routes"));
const shared_routes_1 = __importDefault(require("./routes/shared.routes"));
dotenv_1.default.config(); // Load environment variables from .env file
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Connect to Database
(0, db_1.default)();
// Middlewares
app.use((0, cors_1.default)()); // Enable CORS for all origins
app.use(express_1.default.json()); // Middleware to parse JSON bodies
app.use(express_1.default.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
// Basic Route for testing
app.get('/', (req, res) => {
    res.send('EA Analytics API Running...');
});
// API Routes
app.use('/api/structurizr', structurizr_routes_1.default);
app.use('/api/c4ts', c4ts_routes_1.default); // Even if mostly stubs, define the route prefix
app.use('/api/shared', shared_routes_1.default); // For combined data or general endpoints
// Simple error handling middleware (optional, can be expanded)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
