import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { isWithinInterval, parseISO } from 'date-fns';

import StatsCard from '../components/common/StatsCard';
import SingleLineMetricChart from '../components/charts/SingleLineMetricChart';
import TableComponent, { ColumnDef } from '../components/common/TableComponent';

import { fetchAllC4TSLogs, fetchRawStructurizrLogsByDate } from '../services/apiService';
import {
  transformC4TSLogsToTimeSeries,
  transformStructurizrToCreationTrend,
  transformToTopUsersAcrossSystems,
  getStructurizrActiveWorkspaceCount,
  extractC4TSDistinctUsers,
  extractStructurizrDistinctUsers,
} from '../utils/dataTransformer';
import { getPrecedingPeriod, getTimeframeDates } from '../utils/dateUtils';

import { OverviewSummaryStats, RawApiLog, RawStructurizrLog } from '../types/analytics';
import { UserData, ActiveFilters, Trend } from '../types/common';
import { calculateTrend } from '../utils/trendUtils';

const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

/**
 * CHANGE (NEW):
 * - We now expect usersMetadata from Layout via Outlet context.
 * - Shape matches your backend response:
 *    { [userId: string]: { department: string } }
 */
type UsersMetadataMap = Record<string, { department?: string }>;

interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;

  // ✅ CHANGE (NEW)
  usersMetadata?: UsersMetadataMap;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }

  const { activeFilters, setLastUpdated, usersMetadata } = outletContext;

  const { data: allData, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['overviewPageDataWithTrends', activeFilters],
    queryFn: async () => {
      const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);

      let previousPeriod = { start: currentStart, end: currentEnd };
      let fetchStartDate = currentStart;

      if (activeFilters.timeframe !== 'all-time') {
        previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
        fetchStartDate = previousPeriod.start;
      }

      const fetchEndDate = currentEnd;

      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(fetchStartDate, fetchEndDate),
        fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
      ]);

      return { c4tsLogs, structurizrLogs, currentPeriod: { start: currentStart, end: currentEnd }, previousPeriod };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);

  const pageData = useMemo(() => {
    if (!allData) return null;

    const { c4tsLogs, structurizrLogs, currentPeriod, previousPeriod } = allData;

    const c4tsFilteredByEnv =
      activeFilters.environment === 'ALL'
        ? c4tsLogs
        : c4tsLogs.filter((log) => log.environment === activeFilters.environment);

    const structurizrFilteredByEnv =
      activeFilters.environment === 'ALL'
        ? structurizrLogs
        : structurizrLogs.filter((log) => log.environment === activeFilters.environment);

    /**
     * CHANGE (NEW): Department filtering
     * - Build a Set of users in the selected department
     * - Apply dept filter BEFORE user filter
     */
    const isAllDepartments =
      // supports either constant name depending on what you used in constants
      activeFilters.department === 'ALL_DEPARTMENTS' || activeFilters.department === 'ALL';

    let usersInSelectedDept: Set<string> | null = null;

    if (!isAllDepartments && usersMetadata) {
      usersInSelectedDept = new Set(
        Object.entries(usersMetadata)
          .filter(([, meta]) => meta?.department === activeFilters.department)
          .map(([userId]) => userId)
      );
    }

    const filterByDepartment = (logs: (RawApiLog | RawStructurizrLog)[]) => {
      if (!usersInSelectedDept) return logs;

      return logs.filter((log) => {
        const userId = (log as RawApiLog).user ?? (log as RawStructurizrLog).eonid;
        if (!userId) return false;
        return usersInSelectedDept!.has(userId);
      });
    };

    const c4tsFilteredByDept = filterByDepartment(c4tsFilteredByEnv) as RawApiLog[];
    const structurizrFilteredByDept = filterByDepartment(structurizrFilteredByEnv) as RawStructurizrLog[];

    const filterByUser = (logs: (RawApiLog | RawStructurizrLog)[], user: string) => {
      if (user === 'ALL_USERS') return logs;
      return logs.filter((log) => (log as RawApiLog).user === user || (log as RawStructurizrLog).eonid === user);
    };

    // ✅ CHANGE: user filtering happens AFTER dept filtering now
    const c4tsFiltered = filterByUser(c4tsFilteredByDept, activeFilters.user) as RawApiLog[];
    const structurizrFiltered = filterByUser(structurizrFilteredByDept, activeFilters.user) as RawStructurizrLog[];

    const filterByDateRange = (logs: (RawApiLog | RawStructurizrLog)[], range: { start: Date; end: Date }) => {
      return logs.filter((log) => {
        const dateString = (log as any).created_at || (log as any).createdAt;
        if (!dateString) return false;
        try {
          const date = parseISO(dateString);
          if (isNaN(date.getTime())) return false;
          return isWithinInterval(date, range);
        } catch {
          return false;
        }
      });
    };

    const c4tsCurrent = filterByDateRange(c4tsFiltered, currentPeriod) as RawApiLog[];
    const c4tsPrevious = filterByDateRange(c4tsFiltered, previousPeriod) as RawApiLog[];
    const structurizrCurrent = filterByDateRange(structurizrFiltered, currentPeriod) as RawStructurizrLog[];
    const structurizrPrevious = filterByDateRange(structurizrFiltered, previousPeriod) as RawStructurizrLog[];

    const isAllTime = activeFilters.timeframe === 'all-time';
    const neutralTrend: Trend = { value: 0, direction: 'neutral' };

    const stats: OverviewSummaryStats = {
      totalApiHits: {
        value: c4tsCurrent.length,
        trend: isAllTime ? neutralTrend : calculateTrend(c4tsCurrent.length, c4tsPrevious.length),
      },
      activeWorkspaces: {
        value: getStructurizrActiveWorkspaceCount(structurizrCurrent),
        trend: isAllTime
          ? neutralTrend
          : calculateTrend(
              getStructurizrActiveWorkspaceCount(structurizrCurrent),
              getStructurizrActiveWorkspaceCount(structurizrPrevious)
            ),
      },
      totalC4TSUsers: {
        value: extractC4TSDistinctUsers(c4tsCurrent).size,
        trend: isAllTime
          ? neutralTrend
          : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size),
      },
      totalStructurizrUsers: {
        value: extractStructurizrDistinctUsers(structurizrCurrent).size,
        trend: isAllTime
          ? neutralTrend
          : calculateTrend(
              extractStructurizrDistinctUsers(structurizrCurrent).size,
              extractStructurizrDistinctUsers(structurizrPrevious).size
            ),
      },
    };

    /**
     * CHANGE (OPTIONAL, but helpful):
     * - Enrich Top Users table with department from metadata
     * - Keeps existing structure; only fills department when available
     */
    const rawTopUsers = transformToTopUsersAcrossSystems(c4tsCurrent, structurizrCurrent);

    const topUsersData = usersMetadata
      ? rawTopUsers.map((u) => ({
          ...u,
          department: u.department || usersMetadata[u.name]?.department || usersMetadata[u.id]?.department || 'Unknown',
        }))
      : rawTopUsers;

    return {
      stats,
      c4tsChartData: transformC4TSLogsToTimeSeries(c4tsCurrent),
      structurizrChartData: transformStructurizrToCreationTrend(structurizrCurrent),
      topUsersData,
    };
  }, [allData, activeFilters, usersMetadata]); // ✅ CHANGE: add usersMetadata dependency

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(
    () => [
      { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
      { header: 'Department', accessorKey: 'department' },
      {
        header: 'C4TS API Hits',
        accessorKey: 'c4tsApiHits',
        cellRenderer: (value) => formatNumber(value as number),
        tdClassName: 'text-right',
        thClassName: 'text-right',
      },
      {
        header: 'Structurizr Workspaces',
        accessorKey: 'structurizrWorkspaces',
        cellRenderer: (value) => formatNumber(value as number),
        tdClassName: 'text-right',
        thClassName: 'text-right',
      },
    ],
    []
  );

  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-gray-500">Error: {(error as any).message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  return (
    <div className="space-y-6">
      <StatsCard
        items={[
          { title: 'Total API Hits (C4TS)', value: formatNumber(pageData.stats.totalApiHits.value), trend: pageData.stats.totalApiHits.trend },
          { title: 'Active Workspaces (Structurizr)', value: formatNumber(pageData.stats.activeWorkspaces.value), trend: pageData.stats.activeWorkspaces.trend },
          { title: 'Total Users (C4TS)', value: formatNumber(pageData.stats.totalC4TSUsers.value), trend: pageData.stats.totalC4TSUsers.trend },
          { title: 'Total Users (Structurizr)', value: formatNumber(pageData.stats.totalStructurizrUsers.value), trend: pageData.stats.totalStructurizrUsers.trend },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2>
            <Link to="/c4ts" className="text-primary-600 text-sm font-medium hover:text-primary-500">
              View Details →
            </Link>
          </div>
          <div className="px-6 pb-6">
            <SingleLineMetricChart
              data={pageData.c4tsChartData}
              lineName="API Hits"
              lineColor="#3b82f6"
              yAxisLabel="Count"
              aspect={2.5}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2>
            <Link to="/structurizr" className="text-primary-600 text-sm font-medium hover:text-primary-500">
              View Details →
            </Link>
          </div>
          <div className="px-6 pb-6">
            <SingleLineMetricChart
              data={pageData.structurizrChartData}
              lineName="Workspaces Created"
              lineColor="#10b981"
              yAxisLabel="Count"
              aspect={2.5}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2>
        </div>

        <TableComponent
          columns={topUsersColumns}
          data={pageData.topUsersData}
          getRowKey="id"
          noDataMessage="No top user data to display."
        />
      </div>
    </div>
  );
};

export default Overview;