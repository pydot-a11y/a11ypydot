// src/services/apiService.ts (Full Rebuilt Code - Corrected)

import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getTimeframeDates, formatDateForApi, getTrendCalculationPeriods } from '../utils/dateUtils';
import { extractDistinctUsers, transformLogsToTimeSeries, transformLogsToTopEndpoints, transformLogsToTopUsers } from '../utils/dataTransformer';
import { RawApiLog, DataPoint, CategoricalChartData, OverviewSummaryStats } from '../types/analytics';
import { ActiveFilters, UserData } from '../types/common';
import { Trend } from '../types/common'; // Explicitly import Trend

// --- NEW (BUT PREVIOUSLY MISSING): Helper function for trend calculation ---
const calculateTrend = (current: number, previous: number): Trend => {
  if (previous === 0) {
    return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const percentageChange = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral',
  };
};

// --- CORE DATA FETCHER ---
const fetchRawC4TSLogsByDate = async (startDate: Date, endDate: Date): Promise<RawApiLog[]> => {
  const params = new URLSearchParams({
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  });
  const endpoint = `/query/305522/c4ts_access_logs/PROD?${params.toString()}`;
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await axios.get<RawApiLog[]>(fullUrl);
    return response.data || [];
  } catch (error) {
    console.error('Error in fetchRawC4TSLogsByDate:', error);
    throw new Error('Failed to fetch C4TS access logs from the backend.');
  }
};

// --- PUBLIC SERVICE FUNCTIONS ---
// (These have been corrected to use the right filtering logic)

export const fetchC4TSApiHitsOverTime = async (filters: ActiveFilters): Promise<DataPoint[]> => {
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  const filteredLogs = filters.user !== 'ALL_USERS' ? rawLogs.filter(log => log.user === filters.user) : rawLogs;
  return transformLogsToTimeSeries(filteredLogs);
};

export const fetchC4TSTopEndpoints = async (filters: ActiveFilters): Promise<ApiEndpointData[]> => {
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  const filteredLogs = filters.user !== 'ALL_USERS' ? rawLogs.filter(log => log.user === filters.user) : rawLogs;
  return transformLogsToTopEndpoints(filteredLogs, 50);
};

export const fetchC4TSTopUsersChartData = async (filters: ActiveFilters): Promise<CategoricalChartData[]> => {
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  const filteredLogs = filters.user !== 'ALL_USERS' ? rawLogs.filter(log => log.user === filters.user) : rawLogs;
  return transformLogsToTopUsers(filteredLogs, 6);
};

export const fetchDistinctC4TSUsers = async (): Promise<string[]> => {
  const { startDate, endDate } = getTimeframeDates('all-time');
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  return extractDistinctUsers(rawLogs);
};

export const fetchOverviewSummaryStats = async (filters: ActiveFilters): Promise<OverviewSummaryStats> => {
  const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
  const [currentPeriodRawLogs, previousPeriodRawLogs] = await Promise.all([
    fetchRawC4TSLogsByDate(currentPeriod.startDate, currentPeriod.endDate),
    fetchRawC4TSLogsByDate(previousPeriod.startDate, previousPeriod.endDate)
  ]);

  const filterByUser = (logs: RawApiLog[]) => filters.user !== 'ALL_USERS' ? logs.filter(log => log.user === filters.user) : logs;
  const currentPeriodLogs = filterByUser(currentPeriodRawLogs);
  const previousPeriodLogs = filterByUser(previousPeriodRawLogs);
  
  const totalApiHitsTrend = calculateTrend(currentPeriodLogs.length, previousPeriodLogs.length);
  const totalUsersTrend = calculateTrend(extractDistinctUsers(currentPeriodLogs).length, extractDistinctUsers(previousPeriodLogs).length);
  
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);
  const selectedTimeframeRawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  const selectedTimeframeLogs = filterByUser(selectedTimeframeRawLogs);

  return {
    totalApiHits: { value: selectedTimeframeLogs.length, trend: totalApiHitsTrend },
    totalUsers: { value: extractDistinctUsers(selectedTimeframeLogs).length, trend: totalUsersTrend },
    activeWorkspaces: { value: 0, trend: { value: 0, direction: 'neutral' } },
    totalDepartments: { value: 0, trend: { value: 0, direction: 'neutral' } },
  };
};

// --- STUBBED & OVERVIEW FUNCTIONS (UNCHANGED LOGIC, BUT KEPT FOR COMPLETENESS) ---

export const fetchC4TSOverviewChartData = async (filters: ActiveFilters): Promise<any> => {
  const { startDate, endDate } = getTimeframeDates(filters.timeframe);
  const rawLogs = await fetchRawC4TSLogsByDate(startDate, endDate);
  const filteredLogs = filters.user !== 'ALL_USERS' ? rawLogs.filter(log => log.user === filters.user) : rawLogs;
  return {
    seriesData: transformLogsToTimeSeries(filteredLogs),
    mostUsedEndpoint: transformLogsToTopEndpoints(filteredLogs, 1)[0]?.url,
    topUser: transformLogsToTopUsers(filteredLogs, 1)[0]?.name
  }
}

// Stubs for Structurizr and other data sources remain.
export const fetchStructurizrWorkspacesTrend = async (filters?: ActiveFilters): Promise<any[]> => { console.warn("STUBBED: fetchStructurizrWorkspacesTrend"); return []; };
export const fetchStructurizrAccessMethods = async (filters?: ActiveFilters): Promise<any[]> => { console.warn("STUBBED: fetchStructurizrAccessMethods"); return []; };
export const fetchStructurizrTopUsersChartData = async (filters?: ActiveFilters): Promise<CategoricalChartData[]> => { console.warn("STUBBED: fetchStructurizrTopUsersChartData"); return []; };
export const fetchStructurizrOverviewChartData = async (filters: ActiveFilters): Promise<any> => { console.warn("STUBBED: fetchStructurizrOverviewChartData"); return { seriesData: [] }; }
export const fetchTopUsersAcrossSystems = async (filters: ActiveFilters): Promise<UserData[]> => { console.warn("STUBBED: fetchTopUsersAcrossSystems"); return []; }


// --- NEW (BUT PREVIOUSLY MISSING): EXPORTING TYPES ---
// These types were used in StructurizrAnalytics but were not exported.
export type WorkspaceTrendDataPoint = { date: string; active: number; created: number; deleted: number; };
export type AccessMethodData = { id: string; name: string; users: number; rate: number; color?: string; };