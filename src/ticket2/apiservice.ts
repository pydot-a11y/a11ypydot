// src/services/apiService.ts

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi } from '../utils/dateUtils';
import { RawApiLog, RawStructurizrLog } from '../types/analytics';
import { ENVIRONMENTS_TO_FETCH } from '../constants/Filters';
// Imports from your new code
import { getInstance, IEmployee } from '@morgan-stanley/gpit-torch-identity-data';

// --- NEW: Helper for localhost user data (from your screenshot) ---
const localhostUserData: IEmployee = {
    division: undefined,
    workphone: undefined,
    mobilephone: undefined,
    title: undefined,
    lastname: "User",
    userid: "localhost",
    seat: undefined,
    emailaddress: undefined,
    department: undefined,
    givenname: "Local",
    city: undefined,
    homephone: undefined,
    msid: "12345"
};

export const getCurrentUserData = async (): Promise<IEmployee> => {
  try {
    // This call might fail due to CORS depending on the environment
    return await getInstance().getIdentityAsync("grn:/ms/ea/EATooling/EA-Analytics");
  } catch (err) {
    console.warn("Could not fetch current user data, falling back to localhost default. Error:", err);
    return localhostUserData;
  }
};

// --- CORE DATA FETCHERS (Corrected with robust returns) ---

const fetchRawC4TSLogsByDate = async (startDate: Date, endDate: Date, environment: string): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const endpoint = `/query/305522/c4ts_access_logs/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    // Ensure we always return an array
    return response.data || [];
  } catch (error: any) {
    console.error(`Error fetching C4TS Logs for env '${environment}':`, error.message);
    if (error.response?.status === 401) {
        throw new Error('Unauthorized');
    }
    // CRITICAL FIX: Return an empty array on failure so Promise.allSettled doesn't get `undefined`.
    return [];
  }
};

const fetchRawStructurizrLogsByDate = async (startDate: Date, endDate: Date, environment: string): Promise<RawStructurizrLog[]> => {
  const params = new URLSearchParams({ startDate: formatDateForApi(startDate), endDate: formatDateForApi(endDate) });
  const endpoint = `/query/305522/structurizr_workspace_creation_metrics/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawStructurizrLog[]>(fullUrl);
    // CRITICAL FIX: Add the environment tag here.
    const taggedData = (response.data || []).map(log => ({ ...log, environment }));
    return taggedData;
  } catch (error: any) {
    console.error(`Error fetching Structurizr Logs for env '${environment}':`, error.message);
    // Return an empty array on failure
    return [];
  }
};


// --- AGGREGATOR FUNCTIONS (Corrected with robust checks) ---

export const fetchAllC4TSLogs = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const promises = ENVIRONMENTS_TO_FETCH.map(env => fetchRawC4TSLogsByDate(startDate, endDate, env));
  const results = await Promise.allSettled(promises);
  
  let allLogs: RawApiLog[] = [];
  results.forEach((result, index) => {
    const env = ENVIRONMENTS_TO_FETCH[index];
    if (result.status === 'fulfilled') {
      // CRITICAL FIX: Check if result.value is an array before calling .map
      if (Array.isArray(result.value)) {
        const taggedLogs = result.value.map(log => ({ ...log, environment: env }));
        allLogs = allLogs.concat(taggedLogs);
      }
    } else {
      console.error(`Promise rejected for fetching C4TS logs for environment: ${env}`, result.reason);
    }
  });
  return allLogs;
};

// For Structurizr, since the multi-env endpoint isn't ready, we simplify.
// This avoids the aggregator complexity for now.
export const fetchAllStructurizrLogs = async (startDate: Date, endDate: Date): Promise<RawStructurizrLog[]> => {
    // We only call the 'PROD' environment as per the requirement.
    return fetchRawStructurizrLogsByDate(startDate, endDate, 'PROD');
};