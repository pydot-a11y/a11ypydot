// src/controllers/shared.controller.ts
import { Request, Response } from 'express';

// STUB: For "Top Users Across All Systems" table
export const getTopUsersAcrossSystems = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        message: "Data for 'Top Users Across All Systems' requires joining and processing data from multiple sources or more detailed user information, which is not currently available or implemented.",
        data: [
            // You can return an empty array or a very minimal structure
            // { user: 'User A (Stub)', department: 'ETS (Stub)', c4tsApiHits: 0, structurizrWorkspaces: 0 },
        ]
    });
};