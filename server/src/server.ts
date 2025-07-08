// src/server.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';

// Import routes
import structurizrRoutes from './routes/structurizr.routes';
import c4tsRoutes from './routes/c4ts.routes';
import sharedRoutes from './routes/shared.routes';


dotenv.config(); // Load environment variables from .env file

const app: Express = express();
const PORT = process.env.PORT || 5001;

// Connect to Database
connectDB();

// Middlewares
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

// Basic Route for testing
app.get('/', (req: Request, res: Response) => {
    res.send('EA Analytics API Running...');
});

// API Routes
app.use('/api/structurizr', structurizrRoutes);
app.use('/api/c4ts', c4tsRoutes); // Even if mostly stubs, define the route prefix
app.use('/api/shared', sharedRoutes); // For combined data or general endpoints


// Simple error handling middleware (optional, can be expanded)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});