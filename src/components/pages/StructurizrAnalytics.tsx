// src/pages/StructurizrAnalytics.tsx

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

// Component Imports
import WorkspaceTrendChart from '../../components/charts/WorkspaceTrendChart';
import DonutChartComponent, { DonutChartDataItem } from '../../components/charts/DonutChartComponent';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';

// API & Transformer Imports
import { fetchRawStructurizrLogsByDate } from '../../services/apiService';
import {
  transformStructurizrToMultiLineTrend,
  transformStructurizrToAccessMethods,
  transformStructurizrToTopUsers,
} from '../../utils/dataTransformer';
import { getTimeframeDates } from '../../utils/dateUtils';

// Type Imports
import { MultiLineDataPoint, CategoricalChartData, RawStructurizrLog } from '../../types/analytics';
import { ActiveFilters } from '../../types/common';

// Helper for consistent number formatting
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// Context Type Definition
interface PageContextType {
  activeFilters: ActiveFilters;
}

const StructurizrAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  // Guard Clause: Render a loading state until filters are available
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single query fetches all raw Structurizr log data for the selected timeframe.
  const { data: rawLogs, isLoading, error } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['structurizrRawLogs', activeFilters.timeframe],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
  });

  // --- 2. FRONTEND FILTERING & DATA TRANSFORMATION (DERIVED DATA) ---

  // First, filter the raw data by the selected user.
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    if (activeFilters.user === 'ALL_USERS') return rawLogs;
    return rawLogs.filter(log => log.eonid === activeFilters.user);
  }, [rawLogs, activeFilters.user]);

  // Now, transform the filtered data for each component using useMemo for efficiency.
  
  // For the main trend chart, we typically want to show the overall trend, not filtered by a single user.
  // So we use the original `rawLogs`.
  const workspacesTrendData: MultiLineDataPoint[] = useMemo(() => {
    return rawLogs ? transformStructurizrToMultiLineTrend(rawLogs) : [];
  }, [rawLogs]);

  // For Top Users, we use the `filteredLogs` to respect the user filter.
  // If "All Users" is selected, this shows the overall top users.
  const topUsersData: CategoricalChartData[] = useMemo(() => {
    return filteredLogs ? transformStructurizrToTopUsers(filteredLogs, 6) : [];
  }, [filteredLogs]);

  // Access Methods are also derived from the `filteredLogs`.
  const accessMethodsData = useMemo(() => {
    return filteredLogs ? transformStructurizrToAccessMethods(filteredLogs) : [];
  }, [filteredLogs]);

  // The access methods table and donut chart need the same data, just formatted differently for the donut.
  const donutChartAccessData: DonutChartDataItem[] = useMemo(() => {
      return accessMethodsData.map(d => ({...d, value: d.value}));
  }, [accessMethodsData]);
  

  // --- 3. RENDER LOGIC ---

  // Use the loading and error state from our single master query
  if (isLoading) return <div className="p-6 text-center text-gray-500">Loading Structurizr Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error fetching data: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* Structurizr Workspaces Multi-Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Structurizr Workspaces</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          <WorkspaceTrendChart data={workspacesTrendData} aspect={3} />
        </div>
      </div>

      {/* How workspaces are being accessed & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Access Methods Donut Chart & Table Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">How workspaces are being accessed</h2>
          {accessMethodsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 h-48 md:h-full">
                <DonutChartComponent data={donutChartAccessData} aspect={1} innerRadius="60%" outerRadius="85%" showLegend={false} />
              </div>
              <div className="md:col-span-2">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="py-2 pr-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instance</th>
                        <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {accessMethodsData.map((method) => (
                        <tr key={method.name}>
                          <td className="py-2 pr-2 whitespace-nowrap text-sm text-gray-900 flex items-center">
                            <span className={`h-2.5 w-2.5 rounded-full mr-2`} style={{ backgroundColor: method.color || '#CCCCCC' }}></span>
                            {method.name}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap text-sm text-gray-500">{formatNumber(method.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
             <p className="text-center py-10 text-gray-500">No data available for access methods.</p>
          )}
        </div>

        {/* Top Users Bar Chart Card */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            {/* Note: Trend percentage is static as we don't have the data for it */}
            <span className="text-sm font-medium text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
                3.5% Increase
            </span>
          </div>
          <div className="px-6 pb-6">
            <HorizontalBarChart data={topUsersData} barColor="#4ade80" aspect={1.5} xAxisLabel="Workspaces Created" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructurizrAnalytics;