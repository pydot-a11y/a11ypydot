// src/services/apiService.ts

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi } from '../utils/dateUtils';
import { RawApiLog, RawStructurizrLog } from '../types/analytics';
import { ENVIRONMENTS_TO_FETCH } from '../constants/Filters';

// --- CORE DATA FETCHERS ---

// Fetches C4TS logs for a SINGLE specified environment. Used by the aggregator.
const fetchRawC4TSLogsByDate = async (startDate: Date, endDate: Date, environment: string): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const endpoint = `/query/305522/c4ts_access_logs/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching C4TS Logs for env '${environment}':`, error);
    throw error;
  }
};

/**
 * AGGREGATOR: Fetches C4TS logs from all defined environments in parallel.
 * This is the function pages should call.
 */
export const fetchAllC4TSLogs = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const promises = ENVIRONMENTS_TO_FETCH.map(env => fetchRawC4TSLogsByDate(startDate, endDate, env));
  const results = await Promise.allSettled(promises);
  
  let allLogs: RawApiLog[] = [];
  results.forEach((result, index) => {
    const env = ENVIRONMENTS_TO_FETCH[index];
    if (result.status === 'fulfilled') {
      const taggedLogs = result.value.map(log => ({ ...log, environment: env }));
      allLogs = allLogs.concat(taggedLogs);
    } else {
      console.error(`Failed to fetch C4TS logs for environment: ${env}`, result.reason);
    }
  });
  return allLogs;
};

/**
 * Fetches Structurizr logs. This function is UNCHANGED and still fetches from a single source.
 */
export const fetchRawStructurizrLogsByDate = async (startDate: Date, endDate: Date): Promise<RawStructurizrLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const environment = 'PROD'; // Hardcoded as per requirement
  const endpoint = `/query/305522/structurizr_workspace_creation_metrics/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawStructurizrLog[]>(fullUrl);
    // Tag the data so the UI filter can still work correctly
    return (response.data || []).map(log => ({ ...log, environment: 'PROD' }));
  } catch (error) {
    console.error(`Error fetching Structurizr Logs from ${fullUrl}:`, error);
    throw new Error('Failed to fetch Structurizr logs from the backend.');
  }
};