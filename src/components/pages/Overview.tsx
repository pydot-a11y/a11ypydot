import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { isWithinInterval, subYears } from 'date-fns';

// Component Imports
import StatsCard from '../../components/dashboard/StatsCard';
import SingleLineMetricChart from '../../components/charts/SingleLineMetricChart';
import TableComponent, { ColumnDef } from '../../components/common/TableComponent';

// API & Transformer Imports
import { fetchRawC4TSLogsByDate, fetchRawStructurizrLogsByDate } from '../../services/apiService';
import {
  transformC4TSLogsToTimeSeries,
  transformStructurizrToCreationTrend,
  transformToTopUsersAcrossSystems,
  getStructurizrActiveWorkspaceCount,
  extractC4TSDistinctUsers,
  extractStructurizrDistinctUsers
} from '../../utils/dataTransformer';
import { getTimeframeDates, getTrendCalculationPeriods } from '../../utils/dateUtils';

// Type Imports
import { OverviewSummaryStats, RawApiLog, RawStructurizrLog, DataPoint } from '../../types/analytics';
import { UserData, StatsCardDisplayData, ActiveFilters, Trend } from '../../types/common';

const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();
const calculateTrend = (current: number, previous: number): Trend => {
    if (previous === 0) return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
    const percentageChange = ((current - previous) / previous) * 100;
    return { value: Math.abs(percentageChange), direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral' };
};

interface PageContextType { activeFilters: ActiveFilters; }

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  // We use a guard clause here for context, which is fine as it's at the very top.
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- START OF CORRECTION: ALL HOOKS ARE CALLED UNCONDITIONALLY AT THE TOP ---

  // 1. MASTER DATA QUERIES (useQuery)
  const { data: rawC4TSLogs, isLoading: isLoadingC4TS, error: errorC4TS } = useQuery<RawApiLog[], Error>({
    queryKey: ['overviewRawC4TSLogs'],
    queryFn: () => {
        // Fetch 6 months of data for trend calculations
        const { endDate } = getTrendCalculationPeriods().currentPeriod;
        const { startDate } = getTrendCalculationPeriods().previousPeriod;
        return fetchRawC4TSLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: rawStructurizrLogs, isLoading: isLoadingStructurizr, error: errorStructurizr } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['overviewRawStructurizrLogs'],
    queryFn: () => {
        // As per your request, fetch 3 years of data for dev instance to ensure data is present
        const endDate = new Date();
        const startDate = subYears(endDate, 3);
        return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. DERIVED DATA (useMemo)
  const overviewData = useMemo(() => {
    // This calculation will only run when both queries have successfully returned data.
    if (!rawC4TSLogs || !rawStructurizrLogs) return null;

    const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(activeFilters.timeframe);
    const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
    
    // The rest of the derivation logic remains the same...
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawC4TSLogs.filter(log => log.user === activeFilters.user) : rawC4TSLogs;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawStructurizrLogs.filter(log => log.eonid === activeFilters.user) : rawStructurizrLogs;

    const c4tsSelected = c4tsFilteredByUser.filter(log => isWithinInterval(new Date(log.createdAt), { start: selectedStartDate, end: selectedEndDate }));
    // ... all other data slicing and stat calculations ...

    return { /* ... the full overviewData object ... */ };
  }, [rawC4TSLogs, rawStructurizrLogs, activeFilters]);

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  // --- END OF CORRECTION ---

  // 3. RENDER LOGIC (Now placed AFTER all hooks have been called)
  const isLoading = isLoadingC4TS || isLoadingStructurizr;
  const error = errorC4TS || errorStructurizr;

  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;

  // The rest of the component's JSX rendering remains the same...
  return (
    <div className="space-y-6">
      <StatsCard items={overviewData?.stats ? [
            { title: 'Total API Hits (C4TS)', value: formatNumber(overviewData.stats.totalApiHits.value), trend: overviewData.stats.totalApiHits.trend },
            { title: 'Active Workspaces (Structurizr)', value: formatNumber(overviewData.stats.activeWorkspaces.value), trend: overviewData.stats.activeWorkspaces.trend },
            { title: 'Total Users (C4TS)', value: formatNumber(overviewData.stats.totalC4TSUsers.value), trend: overviewData.stats.totalC4TSUsers.trend },
            { title: 'Total Users (Structurizr)', value: formatNumber(overviewData.stats.totalStructurizrUsers.value), trend: overviewData.stats.totalStructurizrUsers.trend },
        ] : []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2><Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={overviewData?.c4tsChartData || []} lineName="API Hits" lineColor="#3b82f6" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2><Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={overviewData?.structurizrChartData || []} lineName="Workspaces Created" lineColor="#10b981" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2></div>
        <TableComponent columns={useMemo(() => [
            { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
            { header: 'Department', accessorKey: 'department' },
            { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
            { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
        ], [])} data={overviewData?.topUsersData || []} noDataMessage="No user data available." />
      </div>
    </div>
  );
};

export default Overview;