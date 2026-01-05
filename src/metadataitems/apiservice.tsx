import axios, { AxiosError, isAxiosError } from 'axios';
import { API_BASE_URL } from '../config';
import { formatDateForApi } from '../utils/dateUtils';
import { RawApiLog, RawStructurizrLog } from '../types/analytics';
import { ENVIRONMENTS_TO_FETCH } from '../constants/Filters';
import { getInstance, IEmployee } from '@morgan-stanley/gpbit-torch-identity-data';

export const fetchRawC4TSLogsByDate = async (
  startDate: Date,
  endDate: Date,
  environment: string
): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  });

  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not defined. Check your .env configuration.');
    return [];
  }

  const endpoint = `/query/305522/c4ts_access_logs/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    return response.data || [];
  } catch (error: any) {
    console.error(`Error fetching C4TS Logs from env '${environment}':`, error);
    if (isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Unauthorized');
    }
    return [];
  }
};

export const fetchAllC4TSLogs = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const promises = ENVIRONMENTS_TO_FETCH.map((env) => fetchRawC4TSLogsByDate(startDate, endDate, env));
  const results = await Promise.allSettled(promises);

  let allLogs: RawApiLog[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      const env = ENVIRONMENTS_TO_FETCH[index];
      const taggedLogs = result.value.map((log) => ({ ...log, environment: env }));
      allLogs = allLogs.concat(taggedLogs);
    } else if (result.status === 'rejected') {
      console.error(`Promise rejected for C4TS env: ${ENVIRONMENTS_TO_FETCH[index]}`, result.reason);
    }
  });

  return allLogs;
};

export const fetchRawStructurizrLogsByDate = async (
  startDate: Date,
  endDate: Date
): Promise<RawStructurizrLog[]> => {
  const params = new URLSearchParams({
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  });

  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not defined. Check your .env configuration.');
    return [];
  }

  const environment = 'PROD'; // Hardcoded for now
  const endpoint = `/query/305522/structurizr_workspace_creation_metrics/${environment}?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await axios.get<RawStructurizrLog[]>(fullUrl);
    // Tagging the data so the UI filter can still work correctly
    return (response.data || []).map((log) => ({ ...log, environment: 'PROD' }));
  } catch (error) {
    console.error(`Error fetching Structurizr Logs from ${fullUrl}:`, error);
    if (isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Unauthorized');
    }
    return [];
  }
};

/**
 * =========================
 * NEW: User metadata fetching
 * Endpoint: GET /user-metadata/{ENV}?ids=user1,user2
 * Response shape (example):
 * { "metadata": { "browjose": { "department": "..." }, "dorothye": { "department": "..." } } }
 * =========================
 */
export type UserMetadata = {
  department?: string;
  // add more fields later if backend returns them
};

type UserMetadataResponse = {
  metadata?: Record<string, UserMetadata>;
};

// ✅ NEW EXPORT
export const fetchUsersMetadata = async (
  userids: string[],
  environment: string
): Promise<Record<string, UserMetadata>> => {
  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not defined. Check your .env configuration.');
    return {};
  }

  if (!userids || userids.length === 0) return {};

  // Backend expects comma-separated IDs in query string
  const ids = userids.join(',');
  const endpoint = `/user-metadata/${environment}?ids=${encodeURIComponent(ids)}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await axios.get<UserMetadataResponse>(fullUrl);
    return response.data?.metadata || {};
  } catch (error: any) {
    console.error(`Error fetching user metadata from env '${environment}':`, error);
    if (isAxiosError(error) && error.response?.status === 401) {
      throw new Error('Unauthorized');
    }
    return {};
  }
};

const localhostUserData: IEmployee = {
  division: undefined,
  workphone: undefined,
  mobilephone: undefined,
  title: undefined,
  lastname: 'User',
  userid: 'localhost',
  seat: undefined,
  emailaddress: undefined,
  department: undefined,
  givenname: 'Local',
  city: undefined,
  homephone: undefined,
  msid: '12345',
};

export const getCurrentUserData = async (): Promise<IEmployee> => {
  try {
    return await getInstance().getIdentityAsync('grn:/ms/ea/EATooling/EA-Analytics');
  } catch (err) {
    console.warn('Could not fetch current user data, falling back to localhost default. Error:', err);
    return localhostUserData;
  }
};