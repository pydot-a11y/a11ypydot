// src/pages/C4TSAnalytics.tsx (Full Rebuilt Code)
import React, { useMemo, useState } from 'react'; // Add useState for "See All"
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

  // --- NEW: State for "See All" functionality ---
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);
  const INITIAL_VISIBLE_ENDPOINTS = 5;

  // --- CRITICAL FIX: Add this guard clause ---
  // If the context from the Layout hasn't rendered yet, show a loading state.
  // This prevents the "Cannot read properties of undefined" crash.
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500">Loading filters...</div>;
  }
  // It's now safe to destructure activeFilters
  const { activeFilters } = outletContext;

  // --- Hooks ---
  const { data: apiHitsData, isLoading: isLoadingApiHits, error: errorApiHits } = useQuery<DataPoint[], Error>({
    queryKey: ['c4tsApiHits', activeFilters],
    queryFn: () => fetchC4TSApiHitsOverTime(activeFilters),
  });

  const c4tsApiHitsPeakInfoProvider = (point: DataPoint): string | null => {
    if (point.date === 'Mar 23' && apiHitsData?.find(p => p.date === 'Mar 23' && p.value === point.value)) {
      return `${point.value} Hits\nMarch, 2025`;
    }
    return null;
  };

  const { data: topUsersChartAPIData, isLoading: isLoadingTopUsers, error: errorTopUsers } = useQuery<CategoricalChartData[], Error>({
    queryKey: ['c4tsTopUsersChart', activeFilters],
    queryFn: () => fetchC4TSTopUsersChartData(activeFilters),
  });

  const { data: topEndpointsData, isLoading: isLoadingTopEndpoints, error: errorTopEndpoints } = useQuery<ApiEndpointData[], Error>({
    queryKey: ['c4tsTopEndpointsTable', activeFilters],
    queryFn: () => fetchC4TSTopEndpoints(activeFilters),
  });

  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [
    { header: 'API URL', accessorKey: 'url', tdClassName: 'font-medium text-gray-900' },
    { header: 'Number of Hits', accessorKey: 'hits', cellRenderer: (value) => (value as number).toLocaleString(), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  const visibleEndpoints = useMemo(() => {
    if (!topEndpointsData) return [];
    return showAllEndpoints ? topEndpointsData : topEndpointsData.slice(0, INITIAL_VISIBLE_ENDPOINTS);
  }, [topEndpointsData, showAllEndpoints]);


  return (
    <div className="space-y-6">
      {/* API Hits Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">API Hits</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          {isLoadingApiHits && <p className="text-center h-72 flex items-center justify-center text-gray-500">Loading API Hits chart...</p>}
          {errorApiHits && <p className="text-center h-72 flex items-center justify-center text-red-500">Error: {errorApiHits.message}</p>}
          {apiHitsData && apiHitsData.length > 0 ? (
            <SingleLineMetricChart data={apiHitsData} lineName="API Hits" lineColor="#2563eb" yAxisLabel={null} aspect={3} peakInfoProvider={c4tsApiHitsPeakInfoProvider} />
          ) : (
            !isLoadingApiHits && <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for API Hits chart.</p>
          )}
        </div>
      </div>

      {/* Top Users Bar Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div></div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            <span className="text-sm font-medium text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
              3.5% Increase {/* Hardcoded */}
            </span>
          </div>
          <div className="px-6 pb-6">
            {isLoadingTopUsers && <p className="text-center h-72 flex items-center justify-center text-gray-500">Loading Top Users chart...</p>}
            {errorTopUsers && <p className="text-center h-72 flex items-center justify-center text-red-500">Error: {errorTopUsers.message}</p>}
            {topUsersChartAPIData && topUsersChartAPIData.length > 0 ? (
              <HorizontalBarChart data={topUsersChartAPIData} barColor="#10b981" aspect={1.5} />
            ) : (
                !isLoadingTopUsers && <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for Top Users chart.</p>
            )}
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
        <TableComponent columns={apiHitsUrlColumns} data={visibleEndpoints} isLoading={isLoadingTopEndpoints} error={errorTopEndpoints} noDataMessage="No API hit data by URL to display." />
      </div>
    </div>
  );
};

export default C4TSAnalytics;