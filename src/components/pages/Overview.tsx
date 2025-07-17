// src/pages/Overview.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
// CORRECTED: Import `parseISO` for safe date parsing and `isAfter`, `isBefore` for robust comparison
import { isWithinInterval, subYears, parseISO, startOfDay, endOfDay } from 'date-fns';

// Component Imports (paths are assumed correct from previous step)
import StatsCard from '../components/dashboard/StatsCard';
import SingleLineMetricChart from '../components/charts/SingleLineMetricChart';
import TableComponent, { ColumnDef } from '../components/common/TableComponent';

// API & Transformer Imports
import { fetchRawC4TSLogsByDate, fetchRawStructurizrLogsByDate } from '../services/apiService';
import {
  transformC4TSLogsToTimeSeries,
  transformStructurizrToCreationTrend,
  transformToTopUsersAcrossSystems,
  getStructurizrActiveWorkspaceCount,
  extractC4TSDistinctUsers,
  extractStructurizrDistinctUsers
} from '../utils/dataTransformer';
import { getTimeframeDates, getTrendCalculationPeriods } from '../utils/dateUtils';

// Type Imports
import { OverviewSummaryStats, RawApiLog, RawStructurizrLog, DataPoint } from '../types/analytics';
import { UserData, StatsCardDisplayData, ActiveFilters, Trend } from '../types/common';

// src/pages/Overview.tsx

// src/pages/Overview.tsx

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

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

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  // Guard Clause: Wait for filters to be available from the Layout
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. DATA FETCHING FOR THE SELECTED TIMEFRAME ---
  // These queries fetch the data needed to display the main card values and charts.
  // This is the primary data the user sees.
  const { data: c4tsSelectedTimeframeLogs, isLoading: isLoadingC4TS, error: errorC4TS } = useQuery<RawApiLog[], Error>({
    queryKey: ['c4tsLogsForSelectedTimeframe', activeFilters],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawC4TSLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: structurizrSelectedTimeframeLogs, isLoading: isLoadingStructurizr, error: errorStructurizr } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['structurizrLogsForSelectedTimeframe', activeFilters],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- 2. DATA FETCHING FOR THE TREND CALCULATION ---
  // This query runs in the background to get the 6-month data needed for trend percentages.
  // It is separate to ensure the main UI can load quickly.
  const { data: trendData } = useQuery({
    queryKey: ['trendCalculationData', activeFilters.user], // Re-calculate trend if the user filter changes
    queryFn: async () => {
      console.log("Fetching data for trend calculation...");
      const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
      const [c4tsCurrent, c4tsPrevious, structurizrCurrent, structurizrPrevious] = await Promise.all([
        fetchRawC4TSLogsByDate(currentPeriod.start, currentPeriod.end),
        fetchRawC4TSLogsByDate(previousPeriod.start, previousPeriod.end),
        fetchRawStructurizrLogsByDate(currentPeriod.start, currentPeriod.end),
        fetchRawStructurizrLogsByDate(previousPeriod.start, previousPeriod.end),
      ]);
      return { c4tsCurrent, c4tsPrevious, structurizrCurrent, structurizrPrevious };
    },
    staleTime: 1000 * 60 * 10, // Cache trend data for 10 minutes
  });


  // --- 3. DERIVED DATA USING useMemo ---
  // This block combines and transforms the data from the queries above.
  const pageData = useMemo(() => {
    // Wait until the primary data for the selected timeframe has loaded.
    if (!c4tsSelectedTimeframeLogs || !structurizrSelectedTimeframeLogs) return null;

    // Apply the user filter from the UI to our fetched data
    const c4tsSelected = activeFilters.user !== 'ALL_USERS' ? c4tsSelectedTimeframeLogs.filter(log => log.user === activeFilters.user) : c4tsSelectedTimeframeLogs;
    const structurizrSelected = activeFilters.user !== 'ALL_USERS' ? structurizrSelectedTimeframeLogs.filter(log => log.eonid === activeFilters.user) : structurizrSelectedTimeframeLogs;
    
    // Default trends to a neutral state
    let trends = {
        totalApiHitsTrend: { value: 0, direction: 'neutral' as const },
        activeWorkspacesTrend: { value: 0, direction: 'neutral' as const },
        totalC4TSUsersTrend: { value: 0, direction: 'neutral' as const },
        totalStructurizrUsersTrend: { value: 0, direction: 'neutral' as const },
    };

    // If the background trend data has loaded, calculate the real trends
    if (trendData) {
        const filterC4TSByUser = (logs: RawApiLog[]) => activeFilters.user !== 'ALL_USERS' ? logs.filter(log => log.user === activeFilters.user) : logs;
        const filterStructurizrByUser = (logs: RawStructurizrLog[]) => activeFilters.user !== 'ALL_USERS' ? logs.filter(log => log.eonid === activeFilters.user) : logs;

        const c4tsCurrentTrend = filterC4TSByUser(trendData.c4tsCurrent);
        const c4tsPreviousTrend = filterC4TSByUser(trendData.c4tsPrevious);
        const structurizrCurrentTrend = filterStructurizrByUser(trendData.structurizrCurrent);
        const structurizrPreviousTrend = filterStructurizrByUser(trendData.structurizrPrevious);

        trends.totalApiHitsTrend = calculateTrend(c4tsCurrentTrend.length, c4tsPreviousTrend.length);
        trends.activeWorkspacesTrend = calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrentTrend), getStructurizrActiveWorkspaceCount(structurizrPreviousTrend));
        trends.totalC4TSUsersTrend = calculateTrend(extractC4TSDistinctUsers(c4tsCurrentTrend).size, extractC4TSDistinctUsers(c4tsPreviousTrend).size);
        trends.totalStructurizrUsersTrend = calculateTrend(extractStructurizrDistinctUsers(structurizrCurrentTrend).size, extractStructurizrDistinctUsers(structurizrPreviousTrend).size);
    }
    
    // Assemble the final stats object for the cards
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsSelected.length, trend: trends.totalApiHitsTrend },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrSelected), trend: trends.activeWorkspacesTrend },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsSelected).size, trend: trends.totalC4TSUsersTrend },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrSelected).size, trend: trends.totalStructurizrUsersTrend },
    };

    // Return a single object containing all the transformed data the UI needs
    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsSelected),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrSelected),
        topUsersData: transformToTopUsersAcrossSystems(c4tsSelected, structurizrSelected),
    };
  }, [c4tsSelectedTimeframeLogs, structurizrSelectedTimeframeLogs, trendData, activeFilters]);

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);


  // --- 4. RENDER LOGIC ---
  const isLoading = isLoadingC4TS || isLoadingStructurizr;
  const error = errorC4TS || errorStructurizr;

  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  return (
    <div className="space-y-6">
      <StatsCard items={[
            { title: 'Total API Hits (C4TS)', value: formatNumber(pageData.stats.totalApiHits.value), trend: pageData.stats.totalApiHits.trend },
            { title: 'Active Workspaces (Structurizr)', value: formatNumber(pageData.stats.activeWorkspaces.value), trend: pageData.stats.activeWorkspaces.trend },
            { title: 'Total Users (C4TS)', value: formatNumber(pageData.stats.totalC4TSUsers.value), trend: pageData.stats.totalC4TSUsers.trend },
            { title: 'Total Users (Structurizr)', value: formatNumber(pageData.stats.totalStructurizrUsers.value), trend: pageData.stats.totalStructurizrUsers.trend },
        ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2><Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={pageData.c4tsChartData} lineName="API Hits" lineColor="#3b82f6" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2><Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={pageData.structurizrChartData} lineName="Workspaces Created" lineColor="#10b981" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2></div>
        <TableComponent
            columns={topUsersColumns}
            data={pageData.topUsersData}
            getRowKey="id"
            noDataMessage="No user data available."
        />
      </div>
    </div>
  );
};

export default Overview;