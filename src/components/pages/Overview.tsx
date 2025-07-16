// src/pages/Overview.tsx

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';

// Component Imports
import StatsCard from '../../components/dashboard/StatsCard';
import SingleLineMetricChart from '../../components/charts/SingleLineMetricChart';
import TableComponent, { ColumnDef } from '../../components/common/TableComponent';

// API & Transformer Imports
import { fetchOverviewPageData } from '../../services/apiService';
import { transformC4TSLogsToTimeSeries, transformStructurizrToCreationTrend, transformToTopUsersAcrossSystems } from '../../utils/dataTransformer';

// Type Imports
import { OverviewSummaryStats, RawApiLog, RawStructurizrLog, DataPoint } from '../../types/analytics';
import { UserData, StatsCardDisplayData, ActiveFilters } from '../../types/common';

// Helper for consistent number formatting
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// Context Type Definition
interface PageContextType {
  activeFilters: ActiveFilters;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  // Guard Clause: Render a loading state until filters are available from the layout
  if (!outletContext) {
    return <div className="p-6 text-center">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single query fetches all data needed for the entire Overview page.
  const { data: overviewData, isLoading, error } = useQuery<{
    stats: OverviewSummaryStats,
    c4tsLogs: RawApiLog[],
    structurizrLogs: RawStructurizrLog[]
  }, Error>({
    queryKey: ['overviewPageData', activeFilters], // The key includes all filters
    queryFn: () => fetchOverviewPageData(activeFilters),
  });

  // --- 2. DERIVED DATA USING useMemo ---
  // We derive data for each component from the single `overviewData` object.
  // This is highly efficient as transformations only run when `overviewData` changes.

  // Data for the Stats Cards
  const statsForDisplay: StatsCardDisplayData[] = useMemo(() => {
    if (!overviewData) return [];
    const { stats } = overviewData;
    return [
      { title: 'Total API Hits (C4TS)', value: formatNumber(stats.totalApiHits.value), trend: stats.totalApiHits.trend },
      { title: 'Active Workspaces (Structurizr)', value: formatNumber(stats.activeWorkspaces.value), trend: stats.activeWorkspaces.trend },
      { title: 'Total Users (C4TS)', value: formatNumber(stats.totalC4TSUsers.value), trend: stats.totalC4TSUsers.trend },
      { title: 'Total Users (Structurizr)', value: formatNumber(stats.totalStructurizrUsers.value), trend: stats.totalStructurizrUsers.trend },
    ];
  }, [overviewData]);

  // Data for the C4TS summary chart
  const c4tsChartData: DataPoint[] = useMemo(() => {
    return overviewData ? transformC4TSLogsToTimeSeries(overviewData.c4tsLogs) : [];
  }, [overviewData]);

  // Data for the Structurizr summary chart (showing creations)
  const structurizrChartData: DataPoint[] = useMemo(() => {
    return overviewData ? transformStructurizrToCreationTrend(overviewData.structurizrLogs) : [];
  }, [overviewData]);

  // Data for the "Top Users Across All Systems" table
  const topUsersData: UserData[] = useMemo(() => {
    if (!overviewData) return [];
    return transformToTopUsersAcrossSystems(overviewData.c4tsLogs, overviewData.structurizrLogs);
  }, [overviewData]);

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' }, // Will show N/A
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);


  // --- 3. RENDER LOGIC ---
  
  // Show a main loading spinner while the master query is running
  if (isLoading) return <div className="p-6 text-center">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <StatsCard items={statsForDisplay} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* C4TS Analytics Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2>
            <Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link>
          </div>
          <div className="px-6 pb-6">
            <SingleLineMetricChart data={c4tsChartData} lineName="API Hits" lineColor="#3b82f6" yAxisLabel="Count" aspect={2.5} />
          </div>
        </div>

        {/* Structurizr Analytics Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2>
            <Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link>
          </div>
          <div className="px-6 pb-6">
            <SingleLineMetricChart data={structurizrChartData} lineName="Workspaces Created" lineColor="#10b981" yAxisLabel="Count" aspect={2.5} />
          </div>
        </div>
      </div>

      {/* Top Users Across All Systems Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2>
          {/* Note: See all functionality for this table is not yet implemented */}
        </div>
        <TableComponent columns={topUsersColumns} data={topUsersData} noDataMessage="No user data available." />
      </div>
    </div>
  );
};

export default Overview;