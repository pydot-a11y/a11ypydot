// src/services/apiService.ts

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi, getTrendCalculationPeriods } from '../utils/dateUtils';
import { extractC4TSDistinctUsers, getStructurizrActiveWorkspaceCount, extractStructurizrDistinctUsers } from '../utils/dataTransformer';
import { RawApiLog, RawStructurizrLog, OverviewSummaryStats } from '../types/analytics';
import { ActiveFilters, Trend } from '../types/common';

// --- CORE DATA FETCHERS ---
// These functions talk directly to the backend. No changes needed here.

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

// =========================================================================
// == THIS IS THE CORRECTED FUNCTION FOR THE OVERVIEW PAGE ==
// =========================================================================
export const fetchOverviewPageData = async (filters: ActiveFilters): Promise<{
    stats: OverviewSummaryStats,
    c4tsLogs: RawApiLog[],
    structurizrLogs: RawStructurizrLog[]
}> => {
  // 1. Get date ranges for trend calculation and selected timeframe
  const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
  const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(filters.timeframe);

  // 2. Fetch all necessary data from both sources in parallel for maximum efficiency
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
  
  // 3. Define frontend filtering functions based on the selected user
  const filterC4TSByUser = (logs: RawApiLog[]) => filters.user !== 'ALL_USERS' ? logs.filter(log => log.user === filters.user) : logs;
  const filterStructurizrByUser = (logs: RawStructurizrLog[]) => filters.user !== 'ALL_USERS' ? logs.filter(log => log.eonid === filters.user) : logs;

  // 4. Calculate trend values using filtered data
  const totalApiHitsTrend = calculateTrend(filterC4TSByUser(c4tsCurrent).length, filterC4TSByUser(c4tsPrevious).length);
  const activeWorkspacesTrend = calculateTrend(getStructurizrActiveWorkspaceCount(filterStructurizrByUser(structurizrCurrent)), getStructurizrActiveWorkspaceCount(filterStructurizrByUser(structurizrPrevious)));
  const totalC4TSUsersTrend = calculateTrend(extractC4TSDistinctUsers(filterC4TSByUser(c4tsCurrent)).size, extractC4TSDistinctUsers(filterC4TSByUser(c4tsPrevious)).size);
  const totalStructurizrUsersTrend = calculateTrend(extractStructurizrDistinctUsers(filterStructurizrByUser(structurizrCurrent)).size, extractStructurizrDistinctUsers(filterStructurizrByUser(structurizrPrevious)).size);
  
  // 5. Calculate main card values for the selected timeframe using filtered data
  const c4tsSelectedFiltered = filterC4TSByUser(c4tsSelected);
  const structurizrSelectedFiltered = filterStructurizrByUser(structurizrSelected);

  // 6. Assemble the stats object, now matching the CORRECTED OverviewSummaryStats interface
  const overviewStats: OverviewSummaryStats = {
    totalApiHits: { value: c4tsSelectedFiltered.length, trend: totalApiHitsTrend },
    activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrSelectedFiltered), trend: activeWorkspacesTrend },
    totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsSelectedFiltered).size, trend: totalC4TSUsersTrend },
    totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrSelectedFiltered).size, trend: totalStructurizrUsersTrend },
  };

  // 7. Return all data needed by the Overview page to prevent refetching
  return {
    stats: overviewStats,
    c4tsLogs: c4tsSelectedFiltered,
    structurizrLogs: structurizrSelectedFiltered,
  };
};