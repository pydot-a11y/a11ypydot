// src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async (): Promise<void> => {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB Connected...');
    } catch (err: any) { // Use 'any' or a more specific error type
        console.error('MongoDB Connection Error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

export default connectDB;