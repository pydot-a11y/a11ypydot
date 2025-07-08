// src/services/apiService.ts

// --- IMPORTS (Many are new or changed) ---
import axios from 'axios';
import { useQuery } from '@tanstack/react-query'; // Keep this import if you were using it for caching, otherwise it can be removed from here.

// NEW: Import the API base URL from a central config file
import { API_BASE_URL } from '../config';

// NEW: Import our new utility functions
import { getTimeframeDates, formatDateForApi } from '../utils/dateUtils';
import {
  transformLogsToTimeSeries,
  transformLogsToTopUsers,
  transformLogsToTopEndpoints,
  extractDistinctUsers,
} from '../utils/dataTransformer';

// CHANGED: We now need the RawApiLog type
import { RawApiLog, DataPoint, CategoricalChartData, OverviewSummaryStats } from '../types/analytics';
import { ApiEndpointData, ActiveFilters, UserData } from '../types/common';
// --- END IMPORTS ---


// =========================================================================
// == C4TS DATA FETCHING & TRANSFORMATION (ALL NEW LOGIC) ==
// =========================================================================

/**
 * NEW: Internal core function to fetch raw access logs from the Flask backend.
 * This is the only function that directly communicates with the c4ts_access_logs endpoint.
 * @param filters - The currently active filters (timeframe, user, etc.).
 * @returns A promise that resolves to an array of raw API logs.
 */
const fetchC4TSAccessLogsInternal = async (filters: ActiveFilters): Promise<RawApiLog[]> => {
  // 1. Calculate start and end dates from the timeframe filter
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);

  // 2. Build query parameters for the API request
  const params = new URLSearchParams({
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  });

  // 3. Add the 'user' parameter ONLY if a specific user is selected
  if (filters.user && filters.user !== 'ALL_USERS') {
    params.append('user', filters.user); // Your API needs to support a `user=<eonid>` query param
  }
  // TODO: Add region filter if your API supports it
  // if (filters.region && filters.region !== 'ALL_REGIONS') { params.append('region', filters.region); }

  // 4. Construct the final URL based on your Postman screenshot
  // NOTE: The "305522" and "PROD" parts are hardcoded as per your example.
  // These might need to become dynamic parameters if they change.
  const endpoint = `/query/305522/c4ts_access_logs/PROD?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  console.log('Fetching C4TS Logs from Backend:', fullUrl);

  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    // Ensure we always return an array, even if the response is null/undefined
    return response.data || [];
  } catch (error) {
    console.error('Error fetching C4TS Access Logs:', error);
    // Throw error so React Query can handle it
    throw new Error('Failed to fetch C4TS access logs.');
  }
};


// --- Public Service Functions for C4TS (These are called by your pages) ---

/**
 * CHANGED: Now fetches raw logs and transforms them into time-series data.
 * The function signature and return type remain the same, so no page component changes are needed.
 */
export const fetchC4TSApiHitsOverTime = async (filters: ActiveFilters): Promise<DataPoint[]> => {
  const rawLogs = await fetchC4TSAccessLogsInternal(filters);
  return transformLogsToTimeSeries(rawLogs);
};

/**
 * CHANGED: Now fetches raw logs and transforms them into a top endpoints list.
 */
export const fetchC4TSTopEndpoints = async (filters: ActiveFilters): Promise<ApiEndpointData[]> => {
  const rawLogs = await fetchC4TSAccessLogsInternal(filters);
  return transformLogsToTopEndpoints(rawLogs, 10); // Get top 10 for the table
};

/**
 * CHANGED: Now fetches raw logs and transforms them into a top users list for charts.
 */
export const fetchC4TSTopUsersChartData = async (filters: ActiveFilters): Promise<CategoricalChartData[]> => {
  const rawLogs = await fetchC4TSAccessLogsInternal(filters);
  return transformLogsToTopUsers(rawLogs, 6); // Get top 6 for the chart
};

/**
 * NEW: A dedicated function to get all unique users for the filter dropdown.
 * This is crucial for the dynamic filter requirement.
 */
export const fetchDistinctC4TSUsers = async (): Promise<string[]> => {
  // To get all users, we fetch with a wide, default 'all-time' filter.
  // In a real-world scenario, a dedicated `/api/users` endpoint would be more efficient.
  const allTimeFilters: ActiveFilters = {
    timeframe: 'all-time',
    user: 'ALL_USERS',
    region: 'ALL_REGIONS', // Assuming a default region
  };
  const rawLogs = await fetchC4TSAccessLogsInternal(allTimeFilters);
  return extractDistinctUsers(rawLogs);
};


// =========================================================================
// == OTHER DATA (Structurizr, Overview Stats) - UNCHANGED MOCKS FOR NOW ==
// =========================================================================
// These functions are left as stubs so the rest of the application doesn't break.
// They would need their own dedicated backend endpoints and transformation logic.

export const fetchOverviewSummaryStats = async (filters: ActiveFilters): Promise<OverviewSummaryStats> => {
    console.warn("STUBBED: Using mock data for OverviewSummaryStats. Filters:", filters);
    // Returning mock data so the app doesn't break
    const rawLogs = await fetchC4TSAccessLogsInternal(filters); // Example: Base total hits on logs
    return {
        totalApiHits: { value: rawLogs.length, trend: { value: 10.0, direction: 'up' } },
        activeWorkspaces: { value: 36, trend: { value: 3.0, direction: 'down' } },
        totalUsers: { value: extractDistinctUsers(rawLogs).length, trend: { value: 3.2, direction: 'up' } },
        totalDepartments: { value: 23, trend: { value: 8.3, direction: 'up' } },
    };
};

export const fetchC4TSOverviewChartData = async (filters: ActiveFilters): Promise<any> => {
  const rawLogs = await fetchC4TSAccessLogsInternal(filters);
  return {
    seriesData: transformLogsToTimeSeries(rawLogs),
    mostUsedEndpoint: transformLogsToTopEndpoints(rawLogs, 1)[0]?.url,
    topUser: transformLogsToTopUsers(rawLogs, 1)[0]?.name
  }
}

// Keep other functions as stubs
export const fetchStructurizrWorkspacesTrend = async (filters?: ActiveFilters): Promise<any[]> => { console.warn("STUBBED: fetchStructurizrWorkspacesTrend"); return []; };
export const fetchStructurizrAccessMethods = async (filters?: ActiveFilters): Promise<any[]> => { console.warn("STUBBED: fetchStructurizrAccessMethods"); return []; };
export const fetchStructurizrTopUsersChartData = async (filters?: ActiveFilters): Promise<CategoricalChartData[]> => { console.warn("STUBBED: fetchStructurizrTopUsersChartData"); return []; };
export const fetchStructurizrOverviewChartData = async (filters: ActiveFilters): Promise<any> => { console.warn("STUBBED: fetchStructurizrOverviewChartData"); return { seriesData: [] }; }
export const fetchTopUsersAcrossSystems = async (filters: ActiveFilters): Promise<UserData[]> => { console.warn("STUBBED: fetchTopUsersAcrossSystems"); return []; }