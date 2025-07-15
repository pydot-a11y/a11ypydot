// src/services/apiService.ts
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi, getTrendCalculationPeriods } from '../utils/dateUtils';
import { extractC4TSDistinctUsers, getStructurizrActiveWorkspaceCount, extractStructurizrDistinctUsers } from '../utils/dataTransformer';
import { RawApiLog, RawStructurizrLog, OverviewSummaryStats } from '../types/analytics';
import { ActiveFilters, Trend } from '../types/common';

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


// --- HIGH-LEVEL AGGREGATION & DERIVATION FUNCTIONS ---

const calculateTrend = (current: number, previous: number): Trend => {
  if (previous === 0) return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
  const percentageChange = ((current - previous) / previous) * 100;
  return { value: Math.abs(percentageChange), direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral' };
};

export const fetchDistinctC4TSUsers = async (): Promise<string[]> => {
  const { startDate, endDate } = getTimeframeDates('all-time');
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  return Array.from(extractC4TSDistinctUsers(rawLogs)).sort();
};

export const fetchOverviewPageData = async (filters: ActiveFilters): Promise<{
    stats: OverviewSummaryStats,
    c4tsLogs: RawApiLog[],
    structurizrLogs: RawStructurizrLog[]
}> => {
  // 1. Get date ranges for trend calculation and selected timeframe
  const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
  const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(filters.timeframe);

  // 2. Fetch all necessary data in parallel
  const [
    c4tsCurrent, c4tsPrevious, c4tsSelected,
    structurizrCurrent, structurizrPrevious, structurizrSelected
  ] = await Promise.all([
    fetchRawC4TSLogsByDate(currentPeriod.startDate, currentPeriod.endDate),
    fetchRawC4TSLogsByDate(previousPeriod.startDate, previousPeriod.endDate),
    fetchRawC4TSLogsByDate(selectedStartDate, selectedEndDate),
    fetchRawStructurizrLogsByDate(currentPeriod.startDate, currentPeriod.endDate),
    fetchRawStructurizrLogsByDate(previousPeriod.startDate, previousPeriod.endDate),
    fetchRawStructurizrLogsByDate(selectedStartDate, selectedEndDate)
  ]);
  
  // 3. Apply frontend filtering based on the selected user
  const filterC4TSByUser = (logs: RawApiLog[]) => filters.user !== 'ALL_USERS' ? logs.filter(log => log.user === filters.user) : logs;
  const filterStructurizrByUser = (logs: RawStructurizrLog[]) => filters.user !== 'ALL_USERS' ? logs.filter(log => log.eonid === filters.user) : logs;

  // 4. Calculate trend values
  const c4tsApiHitsTrend = calculateTrend(filterC4TSByUser(c4tsCurrent).length, filterC4TSByUser(c4tsPrevious).length);
  const structurizrUsersTrend = calculateTrend(extractStructurizrDistinctUsers(filterStructurizrByUser(structurizrCurrent)).size, extractStructurizrDistinctUsers(filterStructurizrByUser(structurizrPrevious)).size);
  const activeWorkspacesTrend = calculateTrend(getStructurizrActiveWorkspaceCount(filterStructurizrByUser(structurizrCurrent)), getStructurizrActiveWorkspaceCount(filterStructurizrByUser(structurizrPrevious)));
  
  // 5. Calculate main card values for the selected timeframe
  const c4tsSelectedFiltered = filterC4TSByUser(c4tsSelected);
  const structurizrSelectedFiltered = filterStructurizrByUser(structurizrSelected);

  const overviewStats: OverviewSummaryStats = {
    totalApiHits: { value: c4tsSelectedFiltered.length, trend: c4tsApiHitsTrend },
    totalUsers: { value: extractStructurizrDistinctUsers(structurizrSelectedFiltered).size, trend: structurizrUsersTrend }, // This card is now Structurizr Users
    activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrSelectedFiltered), trend: activeWorkspacesTrend },
    totalDepartments: { value: 0, trend: { value: 0, direction: 'neutral' } }, // Replaced by Total Users (Structurizr)
  };

  // 6. Return all data needed by the Overview page to prevent refetching
  return {
    stats: overviewStats,
    c4tsLogs: c4tsSelectedFiltered,
    structurizrLogs: structurizrSelectedFiltered,
  };
};