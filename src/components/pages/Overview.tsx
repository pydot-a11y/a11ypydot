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

  // --- All Hooks Called Unconditionally at the Top ---

  const { data: rawC4TSLogs, isLoading: isLoadingC4TS, error: errorC4TS } = useQuery<RawApiLog[], Error>({
    queryKey: ['overviewRawC4TSLogs'],
    queryFn: () => {
      const { endDate } = getTrendCalculationPeriods().currentPeriod;
      const { startDate } = getTrendCalculationPeriods().previousPeriod;
      return fetchRawC4TSLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: rawStructurizrLogs, isLoading: isLoadingStructurizr, error: errorStructurizr } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['overviewRawStructurizrLogs'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = subYears(endDate, 3);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // This single useMemo block derives all data needed by the page's components
  const pageData = useMemo(() => {
    // Return null if the raw data isn't ready yet
    if (!rawC4TSLogs || !rawStructurizrLogs || !outletContext) {
      return null;
    }

    const { activeFilters } = outletContext;
    const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(activeFilters.timeframe);
    const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
    
    // Apply user filter first
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawC4TSLogs.filter(log => log.user === activeFilters.user) : rawC4TSLogs;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawStructurizrLogs.filter(log => log.eonid === activeFilters.user) : rawStructurizrLogs;

    // Correctly slice data for each period using robust date parsing
    const c4tsSelected = c4tsFilteredByUser.filter(log => { try { return isWithinInterval(parseISO(log.createdAt), { start: selectedStartDate, end: selectedEndDate }); } catch { return false; }});
    const structurizrSelected = structurizrFilteredByUser.filter(log => { try { return log.createdAt?.$date && isWithinInterval(parseISO(log.createdAt.$date), { start: selectedStartDate, end: selectedEndDate }); } catch { return false; }});
    const c4tsCurrentTrend = c4tsFilteredByUser.filter(log => { try { return isWithinInterval(parseISO(log.createdAt), currentPeriod); } catch { return false; }});
    const c4tsPreviousTrend = c4tsFilteredByUser.filter(log => { try { return isWithinInterval(parseISO(log.createdAt), previousPeriod); } catch { return false; }});
    const structurizrCurrentTrend = structurizrFilteredByUser.filter(log => { try { return log.createdAt?.$date && isWithinInterval(parseISO(log.createdAt.$date), currentPeriod); } catch { return false; }});
    const structurizrPreviousTrend = structurizrFilteredByUser.filter(log => { try { return log.createdAt?.$date && isWithinInterval(parseISO(log.createdAt.$date), previousPeriod); } catch { return false; }});
    
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsSelected.length, trend: calculateTrend(c4tsCurrentTrend.length, c4tsPreviousTrend.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrSelected), trend: calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrentTrend), getStructurizrActiveWorkspaceCount(structurizrPreviousTrend)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsSelected).size, trend: calculateTrend(extractC4TSDistinctUsers(c4tsCurrentTrend).size, extractC4TSDistinctUsers(c4tsPreviousTrend).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrSelected).size, trend: calculateTrend(extractStructurizrDistinctUsers(structurizrCurrentTrend).size, extractStructurizrDistinctUsers(structurizrPreviousTrend).size) },
    };

    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsSelected),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrSelected),
        topUsersData: transformToTopUsersAcrossSystems(c4tsSelected, structurizrSelected),
    };
  }, [rawC4TSLogs, rawStructurizrLogs, outletContext]);

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);


  // --- Render Logic (Placed after all hooks) ---
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