// src/pages/C4TSAnalytics.tsx

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';

// Component Imports
import SingleLineMetricChart from '../../components/charts/SingleLineMetricChart';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';
import TableComponent, { ColumnDef } from '../../components/common/TableComponent';

// API & Transformer Imports
import { fetchRawC4TSLogsByDate } from '../../services/apiService';
import {
  transformC4TSLogsToTimeSeries,
  transformC4TSLogsToTopEndpoints,
  transformC4TSLogsToTopUsers,
} from '../../utils/dataTransformer';
import { getTimeframeDates } from '../../utils/dateUtils';

// Type Imports
import { DataPoint, CategoricalChartData, RawApiLog } from '../../types/analytics';
import { ApiEndpointData, ActiveFilters } from '../../types/common';

// Helper for consistent number formatting
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// Context Type Definition
interface PageContextType {
  activeFilters: ActiveFilters;
}

const C4TSAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  
  // Local UI state for the "See All" table functionality
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);
  const INITIAL_VISIBLE_ENDPOINTS = 5;

  // Guard Clause: Render a loading state until filters are available
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single query fetches all raw C4TS log data for the selected timeframe.
  // All other data on this page is derived from this single source of truth.
  const { data: rawLogs, isLoading, error } = useQuery<RawApiLog[], Error>({
    // The query key is based on the timeframe, as this determines the API call.
    // User-based filtering will happen on the frontend.
    queryKey: ['c4tsRawLogs', activeFilters.timeframe],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawC4TSLogsByDate(startDate, endDate);
    },
  });

  // --- 2. FRONTEND FILTERING & DATA TRANSFORMATION (DERIVED DATA) ---
  
  // First, filter the raw data by the selected user. This is fast and efficient.
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    if (activeFilters.user === 'ALL_USERS') return rawLogs;
    return rawLogs.filter(log => log.user === activeFilters.user);
  }, [rawLogs, activeFilters.user]);

  // Now, transform the filtered data for each component.
  // useMemo ensures these transformations only run when `filteredLogs` changes.
  const apiHitsData = useMemo(() => transformC4TSLogsToTimeSeries(filteredLogs), [filteredLogs]);
  const topUsersChartData = useMemo(() => transformC4TSLogsToTopUsers(filteredLogs, 6), [filteredLogs]);
  const topEndpointsData = useMemo(() => transformC4TSLogsToTopEndpoints(filteredLogs, 50), [filteredLogs]); // Fetch more for "See All"
  const visibleEndpoints = useMemo(() => showAllEndpoints ? topEndpointsData : topEndpointsData.slice(0, INITIAL_VISIBLE_ENDPOINTS), [topEndpointsData, showAllEndpoints]);

  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [
    { header: 'API URL', accessorKey: 'url', tdClassName: 'font-medium text-gray-900' },
    { header: 'Number of Hits', accessorKey: 'hits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  const c4tsApiHitsPeakInfoProvider = (point: DataPoint): string | null => {
    // Logic to determine if 'point' is a peak to show a special tooltip
    // This is just an example; you can define your own peak logic.
    if (apiHitsData && point.value === Math.max(...apiHitsData.map(p => p.value))) {
      return `${point.value} Hits\nPeak Activity`;
    }
    return null;
  };

  // --- 3. RENDER LOGIC ---
  
  // Use the loading and error state from our single master query
  if (isLoading) return <div className="p-6 text-center text-gray-500">Loading C4TS Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error fetching data: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* API Hits Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">API Hits</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          <SingleLineMetricChart data={apiHitsData} lineName="API Hits" lineColor="#2563eb" yAxisLabel={null} aspect={3} peakInfoProvider={c4tsApiHitsPeakInfoProvider} />
        </div>
      </div>

      {/* Top Users Bar Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div></div> {/* This empty div pushes the chart to the right */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            {/* Note: Trend percentage is static as we don't have the data for it */}
            <span className="text-sm font-medium text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
              3.5% Increase
            </span>
          </div>
          <div className="px-6 pb-6">
            <HorizontalBarChart data={topUsersChartData} barColor="#10b981" aspect={1.5} />
          </div>
        </div>
      </div>

      {/* API Hits (URL) Table Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Hits (URL)</h2>
          {topEndpointsData && topEndpointsData.length > INITIAL_VISIBLE_ENDPOINTS && (
            <button type="button" className="text-sm font-medium text-primary-600 hover:text-primary-500" onClick={() => setShowAllEndpoints(!showAllEndpoints)}>
              {showAllEndpoints ? 'Show Less' : 'See All'} →
            </button>
          )}
        </div>
        <TableComponent columns={apiHitsUrlColumns} data={visibleEndpoints} noDataMessage="No API hit data by URL to display." />
      </div>
    </div>
  );
};

export default C4TSAnalytics;