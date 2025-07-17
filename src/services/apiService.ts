// src/services/apiService.ts (Full Rebuilt Code - Corrected and Simplified)

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi } from '../utils/dateUtils';
import { extractC4TSDistinctUsers } from '../utils/dataTransformer';
import { RawApiLog, RawStructurizrLog } from '../types/analytics';

// --- CORE DATA FETCHERS ---
// These are the only functions that should talk directly to the backend.

export const fetchRawC4TSLogsByDate = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const endpoint = `/query/305522/c4ts_access_logs/PROD?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching C4TS Logs from ${fullUrl}:`, error);
    throw new Error('Failed to fetch C4TS access logs from the backend.');
  }
};

export const fetchRawStructurizrLogsByDate = async (startDate: Date, endDate: Date): Promise<RawStructurizrLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const endpoint = `/query/305522/structurizr_workspace_creation_metrics/PROD?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawStructurizrLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching Structurizr Logs from ${fullUrl}:`, error);
    throw new Error('Failed to fetch Structurizr logs from the backend.');
  }
};

// --- HIGH-LEVEL DERIVATION FUNCTION ---
// This function fetches users for the dropdown. Your change from "all-time" to 3 years is a good optimization.
export const fetchDistinctC4TSUsers = async (): Promise<string[]> => {
  // As per your request, fetching the last 3 years of data to build the user list.
  const { startDate, endDate } = getTimeframeDates('year'); // We'll just use the 'year' timeframe for now, but your logic is noted.
  // In a real app, you might have a dedicated endpoint for this.
  const rawLogs = await fetchRawC4TSLogsByDate(subYears(endDate, 3), endDate); // Correctly fetches last 3 years
  return Array.from(extractC4TSDistinctUsers(rawLogs)).sort();
};