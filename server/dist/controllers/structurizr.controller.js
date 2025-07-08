"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStructurizrTopUsers = exports.getStructurizrAccessMethods = exports.getStructurizrWorkspacesByStatus = exports.getStructurizrOverviewStats = void 0;
const Workspace_model_1 = __importDefault(require("../models/Workspace.model"));
const getStructurizrOverviewStats = async (req, res) => {
    try {
        const totalWorkspaces = await Workspace_model_1.default.countDocuments();
        const activeWorkspaces = await Workspace_model_1.default.countDocuments({ archived: 'false' });
        // Using eonID as a proxy for "users" associated with workspaces
        const distinctEonIDs = await Workspace_model_1.default.distinct('eonID');
        const uniqueUserProxyCount = distinctEonIDs.filter(id => id != null).length; // Count non-null distinct eonIDs
        // Using instance as a proxy for "departments" or "systems"
        const distinctInstances = await Workspace_model_1.default.distinct('instance');
        const uniqueInstanceProxyCount = distinctInstances.filter(id => id != null).length;
        res.json({
            activeWorkspaces: activeWorkspaces,
            totalWorkspaces: totalWorkspaces,
            // The UI shows "Total Users" and "Total Departments" as separate cards.
            // We'll provide proxies for these based on the available data.
            // Frontend will need to understand these are derived proxies.
            totalUsersProxy: uniqueUserProxyCount,
            totalDepartmentsProxy: uniqueInstanceProxyCount,
            // Trend data cannot be derived from snapshot data without historical context.
            // The frontend will have to manage the display of "trend" arrows statically or as N/A.
        });
    }
    catch (error) {
        console.error('Error fetching Structurizr overview stats:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getStructurizrOverviewStats = getStructurizrOverviewStats;
const getStructurizrWorkspacesByStatus = async (req, res) => {
    try {
        const activeCount = await Workspace_model_1.default.countDocuments({ archived: 'false' });
        const archivedCount = await Workspace_model_1.default.countDocuments({ archived: 'true' });
        const totalCount = await Workspace_model_1.default.countDocuments(); // Total "created" proxy
        // This data is for the "Structurizr Workspaces" chart.
        // It provides snapshot counts, not time-series data for a line chart.
        // The frontend chart will need to represent these as current totals.
        res.json({
            active: activeCount,
            archived: archivedCount, // Corresponds to "Deleted" in Figma if "archived" means deleted
            totalCreatedProxy: totalCount, // Corresponds to "Created" in Figma
        });
    }
    catch (error) {
        console.error('Error fetching Structurizr workspaces by status:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getStructurizrWorkspacesByStatus = getStructurizrWorkspacesByStatus;
// STUB: For "How workspaces are being accessed" - Data not available
const getStructurizrAccessMethods = async (req, res) => {
    res.status(200).json({
        message: "Data for workspace access methods (API, CLI, etc.) is not available from the current 'workspace' collection.",
        data: [] // Return empty array as placeholder for table/chart data
    });
};
exports.getStructurizrAccessMethods = getStructurizrAccessMethods;
// STUB: For "Top Users" chart for Structurizr - Data not available
const getStructurizrTopUsers = async (req, res) => {
    res.status(200).json({
        message: "Data for Structurizr top users (names, detailed activity) is not available beyond eonID counts.",
        data: [] // Return empty array as placeholder
    });
};
exports.getStructurizrTopUsers = getStructurizrTopUsers;
