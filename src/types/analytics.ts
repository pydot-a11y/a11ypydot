// src/types/analytics.ts
import { Trend, UserData, ApiEndpointData } from './common'; // Assuming common.ts is in the same folder

// For simple X-Y data points, e.g., for line charts
export interface DataPoint {
  date: string; // Could also be a generic 'x' label
  value: number;
}

// For bar chart data or similar category-value pairs
export interface CategoricalChartData {
  name: string; // Category name (e.g., user name, endpoint name)
  value: number; // The metric value
}

// Renamed from OverviewStats to be more specific to the raw data from an API
export interface OverviewSummaryStats {
  totalApiHits: {
    value: number;
    trend: Trend;
  };
  activeWorkspaces: {
    value: number;
    trend: Trend;
  };
  totalUsers: {
    value: number;
    trend: Trend;
  };
  totalDepartments: {
    value: number;
    trend: Trend;
  };
}

// This is now more of a "page-specific" data structure.
export interface C4TSPageData {
  apiHitsOverTime: DataPoint[];
  topEndpoints: ApiEndpointData[]; // Reusing ApiEndpointData
  topUsers: CategoricalChartData[]; // Using CategoricalChartData for user:hits
}

// This is now more of a "page-specific" data structure.
export interface StructurizrPageData {
  // For the multi-line chart, this structure is better than separate arrays of DataPoint.
  // Each point in the array represents a date, and for that date, we have active, created, deleted values.
  workspacesTrend: {
    date: string;
    active: number;
    created: number;
    deleted: number;
  }[];
  accessMethods: {
    id: string; // For keys and identifying segments
    name: string; // "API", "CLI"
    users: number;
    rate: number; // e.g., 1.94 for 1.94%
    color?: string; // Optional: for donut chart slices
  }[];
  topUsers: CategoricalChartData[]; // Using CategoricalChartData for user:workspaces
}