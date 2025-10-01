// src/services/apiService.ts

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi } from '../utils/dateUtils';
import { extractC4TSDistinctUsers } from '../utils/dataTransformer';
import { RawApiLog, RawStructurizrLog } from '../types/analytics';
import { ActiveFilters } from '../types/common';
import { ENVIRONMENTS_TO_FETCH } from '../constants/Filters'; // Import the list of environments

// ==========================================================
// == 1. CORE DATA FETCHERS (Now accepts an 'environment' parameter)
// ==========================================================

const fetchRawC4TSLogsByDate = async (startDate: Date, endDate: Date, environment: string): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  // The environment is now a dynamic part of the URL path
  const endpoint = `/query/305522/c4ts_access_logs/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    // We will throw the error to be handled by Promise.allSettled
    console.error(`Error fetching C4TS Logs for env '${environment}':`, error);
    throw error;
  }
};

const fetchRawStructurizrLogsByDate = async (startDate: Date, endDate: Date, environment: string): Promise<RawStructurizrLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  // The environment is now a dynamic part of the URL path
  const endpoint = `/query/305522/structurizr_workspace_creation_metrics/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawStructurizrLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching Structurizr Logs for env '${environment}':`, error);
    throw error;
  }
};


// ==========================================================
// == 2. NEW AGGREGATOR FUNCTIONS (Exported for use in pages)
// ==========================================================

/**
 * Fetches C4TS logs from all defined environments in parallel.
 * It tags each log with its source environment.
 * It uses Promise.allSettled to ensure that even if one environment fails, the others can still return data.
 */
export const fetchAllC4TSLogs = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const promises = ENVIRONMENTS_TO_FETCH.map(env => fetchRawC4TSLogsByDate(startDate, endDate, env));
  const results = await Promise.allSettled(promises);
  
  let allLogs: RawApiLog[] = [];
  results.forEach((result, index) => {
    const env = ENVIRONMENTS_TO_FETCH[index];
    if (result.status === 'fulfilled') {
      // Tag each log with its source environment before adding to the combined array
      const taggedLogs = result.value.map(log => ({ ...log, environment: env }));
      allLogs = allLogs.concat(taggedLogs);
    } else {
      // Log the specific failure but don't stop the entire process
      console.error(`Failed to fetch C4TS logs for environment: ${env}`, result.reason);
    }
  });
  return allLogs;
};

/**
 * Fetches Structurizr logs from all defined environments in parallel.
 * Tags each log with its source environment.
 */
export const fetchAllStructurizrLogs = async (startDate: Date, endDate: Date): Promise<RawStructurizrLog[]> => {
  const promises = ENVIRONMENTS_TO_FETCH.map(env => fetchRawStructurizrLogsByDate(startDate, endDate, env));
  const results = await Promise.allSettled(promises);

  let allLogs: RawStructurizrLog[] = [];
  results.forEach((result, index) => {
    const env = ENVIRONMENTS_TO_FETCH[index];
    if (result.status === 'fulfilled') {
      const taggedLogs = result.value.map(log => ({ ...log, environment: env }));
      allLogs = allLogs.concat(taggedLogs);
    } else {
      console.error(`Failed to fetch Structurizr logs for environment: ${env}`, result.reason);
    }
  });
  return allLogs;
};


// ==========================================================
// == 3. CLEANUP (Old/Stubbed functions are no longer needed here)
// ==========================================================

// The fetchDistinctC4TSUsers and fetchOverviewPageData functions will now be handled
// entirely within the page components that need them, using the aggregator functions above.
// They are no longer part of this service file.