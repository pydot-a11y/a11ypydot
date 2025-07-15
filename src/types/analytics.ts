// src/types/analytics.ts
import { Trend } from './common'; // Import Trend from common types

// --- RAW DATA TYPES (FROM BACKEND) ---

// Raw log format from the C4TS endpoint
export interface RawApiLog {
  _id: { $oid: string };
  user: string; // This is the "eonid"
  uri: string;
  url: string;
  createdAt: string; // ISO Date String, e.g., "2025-02-15T10:00:00.000Z"
}

// Raw log format from the Structurizr endpoint
export interface RawStructurizrLog {
  _id: { $oid: string };
  archived: boolean;
  eonid: string;
  instance: string;
  readRole: string;
  workspaceId: number;
  writeRole: string;
  createdAt?: { $date: string };
  deleted?: boolean; // Assuming a 'deleted' field might exist
}


// --- TRANSFORMED DATA TYPES (FOR UI COMPONENTS) ---

// For simple time-series line charts
export interface DataPoint {
  date: string; // e.g., "Mar 23"
  value: number;
}

// For bar charts or donut chart slices
export interface CategoricalChartData {
  name: string; // Category name (e.g., user name, access method)
  value: number;
  color?: string; // Optional for donut charts
}

// For multi-line trend charts like the Structurizr workspace chart
export interface MultiLineDataPoint {
    date: string;
    [key: string]: any; // Allows for multiple dynamic lines (e.g., active: 10, created: 5)
}


// --- AGGREGATED & API-SPECIFIC TYPES ---

// For the main overview summary cards
// --- THIS IS THE CORRECTED INTERFACE ---
export interface OverviewSummaryStats {
  totalApiHits: { value: number; trend: Trend };
  activeWorkspaces: { value: number; trend: Trend };
  totalC4TSUsers: { value: number; trend: Trend }; // CHANGED: Was 'totalUsers', now more specific
  totalStructurizrUsers: { value: number; trend: Trend }; // CHANGED: Was 'totalDepartments'
}
// --- END CORRECTION ---


// This is an alias for a type defined in common.ts, kept for clarity if needed
export type { ApiEndpointData } from './common';