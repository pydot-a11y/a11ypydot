// src/pages/C4TSAnalytics.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

import SingleLineMetricChart from '../../components/charts/SingleLineMetricChart';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';
import TableComponent, { ColumnDef } from '../../components/common/TableComponent';

import {
  fetchC4TSApiHitsOverTime,
  fetchC4TSTopEndpoints,
  fetchC4TSTopUsersChartData,
} from '../../services/apiService';
import { DataPoint, CategoricalChartData } from '../../types/analytics';
import { ApiEndpointData, ActiveFilters } from '../../types/common';

const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

interface PageContextType {
  activeFilters: ActiveFilters;
}

const C4TSAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const activeFilters = useMemo(() => outletContext ? outletContext.activeFilters : { timeframe: 'all-time', department: 'ALL_DEPARTMENTS', region: 'ALL_REGIONS'} as ActiveFilters, [outletContext]);

  // 1. Fetch API Hits Over Time (Line Chart)
  const { data: apiHitsData, isLoading: isLoadingApiHits, error: errorApiHits } = useQuery<DataPoint[], Error>({
    queryKey: ['c4tsApiHits', activeFilters], // Simplified key if all filters apply
    queryFn: () => fetchC4TSApiHitsOverTime(activeFilters),
    enabled: !!outletContext,
  });

  const c4tsApiHitsPeakInfoProvider = (point: DataPoint): string | null => {
    if (point.date === 'Mar 23' && apiHitsData?.find(p => p.date === 'Mar 23' && p.value === point.value)) { // Example peak from wireframe
      return `${point.value} Hits\nMarch, 2025`;
    }
    return null;
  };

  // 2. Fetch Top Users (Bar Chart)
  const { data: topUsersChartAPIData, isLoading: isLoadingTopUsers, error: errorTopUsers } = useQuery<CategoricalChartData[], Error>({
    queryKey: ['c4tsTopUsersChart', activeFilters.department, activeFilters.region], // Typically not filtered by timeframe
    queryFn: () => fetchC4TSTopUsersChartData(activeFilters),
    enabled: !!outletContext,
  });
  // TODO: The "3.5% Increase" needs its own data source or calculation

  // 3. Fetch API Hits (URL) Table
  const { data: topEndpointsData, isLoading: isLoadingTopEndpoints, error: errorTopEndpoints } = useQuery<ApiEndpointData[], Error>({
    queryKey: ['c4tsTopEndpointsTable', activeFilters.department, activeFilters.region, activeFilters.timeframe], // All filters might apply here
    queryFn: () => fetchC4TSTopEndpoints(activeFilters),
    enabled: !!outletContext,
  });

  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [
    {
      header: 'API URL', // Screenshot says "USER" as title, but data is URL
      accessorKey: 'url',
      tdClassName: 'font-medium text-gray-900',
    },
    {
      header: 'Number of Hits',
      accessorKey: 'hits',
      cellRenderer: (value) => formatNumber(value as number),
      tdClassName: 'text-right',
      thClassName: 'text-right',
    },
  ], []);


  if (!outletContext) return <div className="p-6 text-center">Loading filters...</div>;

  return (
    <div className="space-y-6">
      {/* API Hits Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">API Hits</h2>
          {/* Global timeframe filter is in PageHeader. Here we display it. */}
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          {isLoadingApiHits && <p className="text-center h-72 flex items-center justify-center text-gray-500">Loading API Hits chart...</p>}
          {errorApiHits && <p className="text-center h-72 flex items-center justify-center text-red-500">Error: {errorApiHits.message}</p>}
          {apiHitsData && (
            <SingleLineMetricChart
              data={apiHitsData}
              lineName="API Hits"
              lineColor="#2563eb" // Blue
              yAxisLabel={null} // No Y-axis label as per wireframe for this specific chart
              aspect={3} // Adjust aspect ratio
              peakInfoProvider={c4tsApiHitsPeakInfoProvider}
            />
          )}
          {!isLoadingApiHits && !errorApiHits && (!apiHitsData || apiHitsData.length === 0) && (
            <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for API Hits chart.</p>
          )}
        </div>
      </div>

      {/* Top Users Bar Chart Card */}
      {/* The wireframe shows this pushed to the right, assuming global filters take up left space */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>{/* This empty div helps push the content to the right on larger screens if PageHeader filters are on left */}</div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            <span className="text-sm font-medium text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
              3.5% Increase {/* Still hardcoded */}
            </span>
          </div>
          <div className="px-6 pb-6">
            {isLoadingTopUsers && <p className="text-center h-72 flex items-center justify-center text-gray-500">Loading Top Users chart...</p>}
            {errorTopUsers && <p className="text-center h-72 flex items-center justify-center text-red-500">Error: {errorTopUsers.message}</p>}
            {topUsersChartAPIData && (
              <HorizontalBarChart
                data={topUsersChartAPIData}
                barColor="#10b981" // Green
                aspect={1.5} // Adjust aspect
                // xAxisLabel="Number of Hits"
              />
            )}
            {!isLoadingTopUsers && !errorTopUsers && (!topUsersChartAPIData || topUsersChartAPIData.length === 0) && (
                <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for Top Users chart.</p>
            )}
          </div>
        </div>
      </div>


      {/* API Hits (URL) Table Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Hits (URL)</h2>
          <button
            type="button"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            See All →
          </button>
        </div>
        <TableComponent
          columns={apiHitsUrlColumns}
          data={topEndpointsData || []}
          isLoading={isLoadingTopEndpoints}
          error={errorTopEndpoints}
          noDataMessage="No API hit data by URL to display."
        />
      </div>
    </div>
  );
};

export default C4TSAnalytics;