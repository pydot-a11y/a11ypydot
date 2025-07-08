// src/pages/Overview.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';

import StatsCard from '../../components/dashboard/StatsCard';
import SingleLineMetricChart from '../../components/charts/SingleLineMetricChart';
import TableComponent, { ColumnDef } from '../../components/common/TableComponent'; // Import TableComponent

import {
  fetchOverviewSummaryStats,
  fetchC4TSOverviewChartData,
  fetchStructurizrOverviewChartData,
  fetchTopUsersAcrossSystems,
} from '../../services/apiService';
import { OverviewSummaryStats, DataPoint } from '../../types/analytics';
import { UserData, StatsCardDisplayData, ActiveFilters } from '../../types/common';

const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

interface PageContextType {
  activeFilters: ActiveFilters;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const activeFilters = useMemo(() => outletContext ? outletContext.activeFilters : { timeframe: 'all-time', department: 'ALL_DEPARTMENTS', region: 'ALL_REGIONS'} as ActiveFilters, [outletContext]);

  // 1. Fetch Overview Summary Stats
  const { data: overviewStatsAPIData, isLoading: isLoadingOverviewStats, error: errorOverviewStats } = useQuery<OverviewSummaryStats, Error>({
    queryKey: ['overviewSummaryStats', activeFilters], queryFn: () => fetchOverviewSummaryStats(activeFilters), enabled: !!outletContext,
  });
  const statsForDisplay: StatsCardDisplayData[] = useMemo(() => {
    if (!overviewStatsAPIData) return [];
    return [
      { title: 'Total API Hits (C4TS)', value: formatNumber(overviewStatsAPIData.totalApiHits.value), trend: overviewStatsAPIData.totalApiHits.trend },
      { title: 'Active Workspace (Structurizr)', value: formatNumber(overviewStatsAPIData.activeWorkspaces.value), trend: overviewStatsAPIData.activeWorkspaces.trend },
      { title: 'Total Users', value: formatNumber(overviewStatsAPIData.totalUsers.value), trend: overviewStatsAPIData.totalUsers.trend },
      { title: 'Total Departments', value: formatNumber(overviewStatsAPIData.totalDepartments.value), trend: overviewStatsAPIData.totalDepartments.trend },
    ];
  }, [overviewStatsAPIData]);

  // 2. Fetch C4TS Overview Chart Data
  const { data: c4tsChartAPIData, isLoading: isLoadingC4TSChart, error: errorC4TSChart } = useQuery<{ seriesData: DataPoint[]; mostUsedEndpoint?: string; topUser?: string; }, Error>({
    queryKey: ['c4tsOverviewChart', activeFilters], queryFn: () => fetchC4TSOverviewChartData(activeFilters), enabled: !!outletContext,
  });
   // Peak info provider for C4TS chart tooltip
   const c4tsPeakInfoProvider = (point: DataPoint): string | null => {
    // From screenshot: "289 Hits March, 2025" for C4TS Overview chart's peak
    // This implies the peak is on "Mar 23" if the x-axis is days of march.
    if (point.date === 'Mar 23' && c4tsChartAPIData?.seriesData.find(p => p.date === 'Mar 23' && p.value === point.value)) {
      // Assuming the value from data is the '289'
      return `${point.value} Hits\nMarch, 2025`;
    }
    return null;
  };


  // 3. Fetch Structurizr Overview Chart Data
  const { data: structurizrChartAPIData, isLoading: isLoadingStructurizrChart, error: errorStructurizrChart } = useQuery<{ seriesData: DataPoint[]; topUser?: string; }, Error>({
    queryKey: ['structurizrOverviewChart', activeFilters], queryFn: () => fetchStructurizrOverviewChartData(activeFilters), enabled: !!outletContext,
  });
  // Peak info provider for Structurizr chart tooltip (similar logic if needed)
  const structurizrPeakInfoProvider = (point: DataPoint): string | null => {
    // From screenshot: Structurizr peak was also around Mar 23 with a different value
    if (point.date === 'Mar 23' && structurizrChartAPIData?.seriesData.find(p => p.date === 'Mar 23' && p.value === point.value)) {
      // Example: Assuming the value is the peak for Structurizr overview chart
      return `${point.value} Active\nMarch, 2025`;
    }
    return null;
  };


  // 4. Fetch Top Users Across All Systems
  const { data: topUsersData, isLoading: isLoadingTopUsers, error: errorTopUsers } = useQuery<UserData[], Error>({
    queryKey: ['topUsersAcrossSystems', activeFilters], queryFn: () => fetchTopUsersAcrossSystems(activeFilters), enabled: !!outletContext,
  });

  // Define columns for the Top Users table
  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    {
      header: 'C4TS API Hits',
      accessorKey: 'c4tsApiHits',
      cellRenderer: (value) => formatNumber(value as number),
      tdClassName: 'text-right', // Align numbers to the right
      thClassName: 'text-right',
    },
    {
      header: 'Structurizr Workspaces',
      accessorKey: 'structurizrWorkspaces',
      cellRenderer: (value) => formatNumber(value as number),
      tdClassName: 'text-right', // Align numbers to the right
      thClassName: 'text-right',
    },
  ], []);


  if (!outletContext) return <div className="p-6 text-center">Loading filters...</div>;
  if (isLoadingOverviewStats) return <div className="p-6 text-center">Loading dashboard overview...</div>;
  if (errorOverviewStats) return <div className="p-6 text-center text-red-500">Error: {errorOverviewStats.message}</div>;

  return (
    <div className="space-y-6">
      <StatsCard items={statsForDisplay} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* C4TS Analytics Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2>
            <Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View Details →
            </Link>
          </div>
          <div className="px-6 pb-6">
            {isLoadingC4TSChart && <p className="text-center h-64 flex items-center justify-center text-gray-500">Loading chart...</p>}
            {errorC4TSChart && <p className="text-center h-64 flex items-center justify-center text-red-500">Error: {errorC4TSChart.message}</p>}
            {c4tsChartAPIData && c4tsChartAPIData.seriesData && (
              <SingleLineMetricChart
                data={c4tsChartAPIData.seriesData}
                lineName="API Hits"
                lineColor="#3b82f6"
                yAxisLabel="Count"
                aspect={2.5}
                peakInfoProvider={c4tsPeakInfoProvider}
              />
            )}
            {!isLoadingC4TSChart && !errorC4TSChart && (!c4tsChartAPIData || !c4tsChartAPIData.seriesData || c4tsChartAPIData.seriesData.length === 0) && (
              <p className="text-center h-64 flex items-center justify-center text-gray-500">No data available.</p>
            )}
          </div>
          {c4tsChartAPIData && (
            <div className="border-t border-gray-200 px-6 py-4 flex justify-between text-sm text-gray-500">
              <p>Most Used: <span className="font-medium text-gray-700">{c4tsChartAPIData.mostUsedEndpoint || 'N/A'}</span></p>
              <p>Top User: <span className="font-medium text-gray-700">{c4tsChartAPIData.topUser || 'N/A'}</span></p>
            </div>
          )}
        </div>

        {/* Structurizr Analytics Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2>
            <Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View Details →
            </Link>
          </div>
          <div className="px-6 pb-6">
            {isLoadingStructurizrChart && <p className="text-center h-64 flex items-center justify-center text-gray-500">Loading chart...</p>}
            {errorStructurizrChart && <p className="text-center h-64 flex items-center justify-center text-red-500">Error: {errorStructurizrChart.message}</p>}
            {structurizrChartAPIData && structurizrChartAPIData.seriesData && (
              <SingleLineMetricChart
                data={structurizrChartAPIData.seriesData}
                lineName="Activity"
                lineColor="#10b981"
                yAxisLabel="Count"
                aspect={2.5}
                peakInfoProvider={structurizrPeakInfoProvider}
              />
            )}
             {!isLoadingStructurizrChart && !errorStructurizrChart && (!structurizrChartAPIData || !structurizrChartAPIData.seriesData || structurizrChartAPIData.seriesData.length === 0) && (
                <p className="text-center h-64 flex items-center justify-center text-gray-500">No data available.</p>
            )}
          </div>
          {structurizrChartAPIData && (
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end text-sm text-gray-500">
              <p>Top User: <span className="font-medium text-gray-700">{structurizrChartAPIData.topUser || 'N/A'}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Top Users Across All Systems Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2>
          <button
            type="button"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            See All →
          </button>
        </div>
        <TableComponent
          columns={topUsersColumns}
          data={topUsersData || []} // Provide empty array if data is undefined
          isLoading={isLoadingTopUsers}
          error={errorTopUsers}
          noDataMessage="No top user data to display."
        />
      </div>
    </div>
  );
};

export default Overview;