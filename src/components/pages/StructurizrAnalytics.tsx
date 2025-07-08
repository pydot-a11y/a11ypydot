// src/pages/StructurizrAnalytics.tsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

import WorkspaceTrendChart from '../../components/charts/WorkspaceTrendChart';
import DonutChartComponent, { DonutChartDataItem } from '../../components/charts/DonutChartComponent';
import HorizontalBarChart from '../../components/charts/HorizontalBarChart';

import {
  fetchStructurizrWorkspacesTrend,
  fetchStructurizrAccessMethods,
  fetchStructurizrTopUsersChartData,
  WorkspaceTrendDataPoint, // Type from apiService
  AccessMethodData,        // Type from apiService
} from '../../services/apiService';
import { CategoricalChartData } from '../../types/analytics';
import { ActiveFilters } from '../../types/common';

const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

interface PageContextType {
  activeFilters: ActiveFilters;
}

const StructurizrAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const activeFilters = useMemo(() => outletContext ? outletContext.activeFilters : { timeframe: 'all-time', department: 'ALL_DEPARTMENTS', region: 'ALL_REGIONS'} as ActiveFilters, [outletContext]);

  // 1. Fetch Structurizr Workspaces Trend (Multi-Line Chart)
  const { data: workspacesTrendData, isLoading: isLoadingWorkspacesTrend, error: errorWorkspacesTrend } = useQuery<WorkspaceTrendDataPoint[], Error>({
    queryKey: ['structurizrWorkspacesTrend', activeFilters],
    queryFn: () => fetchStructurizrWorkspacesTrend(activeFilters),
    enabled: !!outletContext,
  });
  // Note: The specific "Active: 30, Created: 5, Deleted: 2" tooltip for Mar 23 is handled
  // inside WorkspaceTrendChart's CustomTooltip if that specific logic is added there.
  // Otherwise, it shows actual line values.

  // 2. Fetch Workspace Access Methods (Donut Chart & Table)
  const { data: accessMethodsAPIData, isLoading: isLoadingAccessMethods, error: errorAccessMethods } = useQuery<AccessMethodData[], Error>({
    queryKey: ['structurizrAccessMethods', activeFilters.department, activeFilters.region], // Not usually filtered by timeframe
    queryFn: () => fetchStructurizrAccessMethods(activeFilters),
    enabled: !!outletContext,
  });

  // Transform AccessMethodData for DonutChartComponent
  const donutChartAccessData: DonutChartDataItem[] | undefined = useMemo(() => {
    if (!accessMethodsAPIData) return undefined;
    return accessMethodsAPIData.map((method: AccessMethodData) => ({
      name: method.name,
      value: method.users, // Using 'users' for the donut slice size
      color: method.color || '#CCCCCC',
    }));
  }, [accessMethodsAPIData]);

  // 3. Fetch Top Users (Bar Chart)
  const { data: topUsersChartAPIData, isLoading: isLoadingTopUsers, error: errorTopUsers } = useQuery<CategoricalChartData[], Error>({
    queryKey: ['structurizrTopUsersChart', activeFilters.department, activeFilters.region],
    queryFn: () => fetchStructurizrTopUsersChartData(activeFilters),
    enabled: !!outletContext,
  });
  // TODO: The "3.5% Increase" needs its own data source or calculation.

  if (!outletContext) return <div className="p-6 text-center">Loading filters...</div>;

  return (
    <div className="space-y-6">
      {/* Structurizr Workspaces Multi-Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Structurizr Workspaces</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          {isLoadingWorkspacesTrend && <p className="text-center h-72 flex items-center justify-center text-gray-500">Loading Workspaces Trend chart...</p>}
          {errorWorkspacesTrend && <p className="text-center h-72 flex items-center justify-center text-red-500">Error: {errorWorkspacesTrend.message}</p>}
          {workspacesTrendData && (
            <WorkspaceTrendChart
              data={workspacesTrendData}
              aspect={3} // Adjust aspect ratio
            />
          )}
          {!isLoadingWorkspacesTrend && !errorWorkspacesTrend && (!workspacesTrendData || workspacesTrendData.length === 0) && (
            <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for Workspaces Trend.</p>
          )}
        </div>
      </div>

      {/* How workspaces are being accessed & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Access Methods Donut Chart & Table Card */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">How workspaces are being accessed</h2>
          {isLoadingAccessMethods && <p className="text-center py-10 text-gray-500">Loading access methods data...</p>}
          {errorAccessMethods && <p className="text-center py-10 text-red-500">Error: {errorAccessMethods.message}</p>}
          {accessMethodsAPIData && donutChartAccessData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 h-48 md:h-full"> {/* Ensure donut has enough height */}
                <DonutChartComponent
                  data={donutChartAccessData}
                  aspect={1} // Keep donut square-ish
                  innerRadius="60%"
                  outerRadius="85%"
                  showLegend={false} // Table acts as legend
                  // centerText={{ primary: "Usage" }} // Optional center text
                />
              </div>
              <div className="md:col-span-2">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="py-2 pr-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Name</th>
                        <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Users</th>
                        <th className="py-2 pl-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {accessMethodsAPIData.map((method) => (
                        <tr key={method.id}>
                          <td className="py-2 pr-2 whitespace-nowrap text-sm text-gray-900 flex items-center">
                            <span className={`h-2.5 w-2.5 rounded-full mr-2`} style={{ backgroundColor: method.color || '#CCCCCC' }}></span>
                            {method.name}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap text-sm text-gray-500">{formatNumber(method.users)}</td>
                          <td className="py-2 pl-2 whitespace-nowrap text-sm text-gray-500">{method.rate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {!isLoadingAccessMethods && !errorAccessMethods && (!accessMethodsAPIData || accessMethodsAPIData.length === 0) && (
            <p className="text-center py-10 text-gray-500">No data available for access methods.</p>
          )}
        </div>

        {/* Top Users Bar Chart Card */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
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
            {topUsersChartAPIData && (
              <HorizontalBarChart
                data={topUsersChartAPIData}
                barColor="#4ade80" // Lighter green
                aspect={1.5} // Adjust aspect
                // xAxisLabel="Number of Workspaces"
              />
            )}
            {!isLoadingTopUsers && !errorTopUsers && (!topUsersChartAPIData || topUsersChartAPIData.length === 0) && (
                <p className="text-center h-72 flex items-center justify-center text-gray-500">No data available for Top Users chart.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructurizrAnalytics;