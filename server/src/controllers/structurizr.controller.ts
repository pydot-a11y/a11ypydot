// src/controllers/structurizr.controller.ts
import { Request, Response } from 'express';
import Workspace, { IWorkspace } from '../models/Workspace.model'; // Assuming IWorkspace is your document interface

export const getStructurizrOverviewStats = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Attempting to fetch Structurizr overview stats using .find()...');

        // Fetch all documents to calculate counts and distinct values manually
        // .lean() returns plain JavaScript objects, which can be faster if you don't need Mongoose documents
        const allWorkspaces: IWorkspace[] = await Workspace.find({}).lean().exec();

        const totalWorkspaces = allWorkspaces.length;

        const activeWorkspaces = allWorkspaces.filter(
            // Adjust condition based on actual data type of 'archived'
            // If boolean: doc => doc.archived === false
            // If string:  doc => doc.archived === 'false'
            doc => String(doc.archived).toLowerCase() === 'false'
        ).length;

        // Calculate distinct eonIDs (proxy for users)
        const eonIdSet = new Set<string>();
        allWorkspaces.forEach(doc => {
            if (doc.eonID) { // Check if eonID exists and is not null/undefined
                eonIdSet.add(doc.eonID);
            }
        });
        const uniqueUserProxyCount = eonIdSet.size;

        // Calculate distinct instances (proxy for departments)
        const instanceSet = new Set<string>();
        allWorkspaces.forEach(doc => {
            if (doc.instance) { // Check if instance exists
                instanceSet.add(doc.instance);
            }
        });
        const uniqueInstanceProxyCount = instanceSet.size;

        console.log('Successfully fetched and processed overview stats with .find().');
        res.json({
            activeWorkspaces: activeWorkspaces,
            totalWorkspaces: totalWorkspaces,
            totalUsersProxy: uniqueUserProxyCount,
            totalDepartmentsProxy: uniqueInstanceProxyCount,
        });

    } catch (error: any) {
        console.error('Error in getStructurizrOverviewStats with .find():', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.errorLabels) console.error('Error labels:', error.errorLabels);
        res.status(500).json({
            message: 'Server Error while fetching Structurizr overview stats',
            error: error.message,
            code: error.code,
            details: error
        });
    }
};

export const getStructurizrWorkspacesByStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Attempting to fetch Structurizr workspaces by status using .find()...');

        const allWorkspaces: IWorkspace[] = await Workspace.find({}).lean().exec();

        const activeCount = allWorkspaces.filter(
            doc => String(doc.archived).toLowerCase() === 'false'
        ).length;

        const archivedCount = allWorkspaces.filter(
            // Adjust condition based on actual data type of 'archived'
            // If boolean: doc => doc.archived === true
            // If string:  doc => doc.archived === 'true'
            doc => String(doc.archived).toLowerCase() === 'true'
        ).length;

        const totalCount = allWorkspaces.length; // Total existing documents

        console.log('Successfully fetched and processed workspace statuses with .find().');
        res.json({
            active: activeCount,
            archived: archivedCount,
            totalCreatedProxy: totalCount,
        });

    } catch (error: any) {
        console.error('Error in getStructurizrWorkspacesByStatus with .find():', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.errorLabels) console.error('Error labels:', error.errorLabels);
        res.status(500).json({
            message: 'Server Error while fetching Structurizr workspace statuses',
            error: error.message,
            code: error.code,
            details: error
        });
    }
};

// STUBBED endpoints remain the same:
// getStructurizrAccessMethods, getStructurizrTopUsers
export const getStructurizrAccessMethods = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        message: "Data for workspace access methods (API, CLI, etc.) is not available from the current 'workspace' collection.",
        data: []
    });
};

export const getStructurizrTopUsers = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        message: "Data for Structurizr top users (names, detailed activity) is not available beyond eonID counts.",
        data: []
    });
};