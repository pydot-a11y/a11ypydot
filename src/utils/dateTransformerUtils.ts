// src/utils/dataTransformer.ts

import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { RawApiLog, RawStructurizrLog, DataPoint, CategoricalChartData, ApiEndpointData, MultiLineDataPoint } from '../types/analytics';
import { UserData } from '../types/common';

// ==========================================================
// == C4TS TRANSFORMERS
// ==========================================================

export const transformC4TSLogsToTimeSeries = (logs: RawApiLog[]): DataPoint[] => {
  if (!logs) return [];
  const hitsByDay: { [date: string]: number } = {};
  logs.forEach(log => {
    try {
      // Group logs by the start of the day to avoid timezone issues
      const day = format(startOfDay(new Date(log.createdAt)), 'yyyy-MM-dd');
      hitsByDay[day] = (hitsByDay[day] || 0) + 1;
    } catch (e) {
      console.warn('Invalid date format in C4TS log:', log.createdAt);
    }
  });

  return Object.entries(hitsByDay)
    .map(([date, value]) => ({
      date: format(new Date(date), 'MMM d'), // Format for display, e.g., "Mar 23"
      value,
    }))
    // Ensure the data is sorted chronologically for the line chart
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const transformC4TSLogsToTopUsers = (logs: RawApiLog[], topN: number = 6): CategoricalChartData[] => {
  if (!logs) return [];
  const hitsByUser: { [user: string]: number } = {};
  logs.forEach(log => {
    hitsByUser[log.user] = (hitsByUser[log.user] || 0) + 1;
  });

  return Object.entries(hitsByUser)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
};

export const transformC4TSLogsToTopEndpoints = (logs: RawApiLog[], limit: number): ApiEndpointData[] => {
  if (!logs) return [];
  const hitsByUri: { [uri: string]: number } = {};
  logs.forEach(log => {
    hitsByUri[log.uri] = (hitsByUri[log.uri] || 0) + 1;
  });

  return Object.entries(hitsByUri)
    .map(([url, hits], index) => ({ id: `endpoint-${index}`, url, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit);
};

export const extractC4TSDistinctUsers = (logs: RawApiLog[]): Set<string> => {
  if (!logs) return new Set();
  return new Set(logs.map(log => log.user));
};

// ==========================================================
// == STRUCTURIZR TRANSFORMERS
// ==========================================================

export const getStructurizrActiveWorkspaceCount = (logs: RawStructurizrLog[]): number => {
    if (!logs) return 0;
    // Your logic is correct: an entry is active if 'archived' is not true and 'deleted' is not true.
    return logs.filter(log => log.archived !== true && log.deleted !== true).length;
};

export const extractStructurizrDistinctUsers = (logs: RawStructurizrLog[]): Set<string> => {
  if (!logs) return new Set();
  return new Set(logs.map(log => log.eonid));
};

export const transformStructurizrToMultiLineTrend = (logs: RawStructurizrLog[]): MultiLineDataPoint[] => {
    if (!logs || logs.length === 0) return [];

    // Group creations and deletions by day
    const dailyActivity: { [date: string]: { created: number; deleted: number; } } = {};
    logs.forEach(log => {
        if (log.createdAt?.$date) {
            const day = format(startOfDay(new Date(log.createdAt.$date)), 'yyyy-MM-dd');
            if (!dailyActivity[day]) {
                dailyActivity[day] = { created: 0, deleted: 0 };
            }
            dailyActivity[day].created++;
            if (log.deleted === true) {
                dailyActivity[day].deleted++;
            }
        }
    });

    // Create a full date range to ensure no gaps in the chart
    const allDates = logs.map(log => startOfDay(new Date(log.createdAt!.$date)));
    const interval = eachDayOfInterval({
        start: new Date(Math.min(...allDates.map(d => d.getTime()))),
        end: new Date(Math.max(...allDates.map(d => d.getTime()))),
    });

    let activeCount = 0; // Simplified active count, see note below
    return interval.map(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        const activity = dailyActivity[dayKey] || { created: 0, deleted: 0 };
        // NOTE: This 'active' count is a running total WITHIN the fetched period. A true "active" count
        // would require knowing the starting number of active workspaces before this period.
        // For visualization of the trend, this running total is often sufficient.
        activeCount += (activity.created - activity.deleted);
        
        return {
            date: format(date, 'MMM d'),
            Created: activity.created,
            Deleted: activity.deleted,
            Active: activeCount,
        };
    });
};

export const transformStructurizrToAccessMethods = (logs: RawStructurizrLog[]): CategoricalChartData[] => {
    if (!logs) return [];
    const countByInstance: { [instance: string]: number } = {};
    logs.forEach(log => {
        countByInstance[log.instance] = (countByInstance[log.instance] || 0) + 1;
    });
    
    const colors = ['#2563eb', '#ea580c', '#dc2626', '#10b981', '#f97316'];
    
    return Object.entries(countByInstance).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
    }));
};

// ==========================================================
// == CONSOLIDATED TRANSFORMERS (ACROSS SYSTEMS)
// ==========================================================

export const transformToTopUsersAcrossSystems = (c4tsLogs: RawApiLog[], structurizrLogs: RawStructurizrLog[]): UserData[] => {
    const c4tsHitsByUser: { [user: string]: number } = {};
    c4tsLogs.forEach(log => { c4tsHitsByUser[log.user] = (c4tsHitsByUser[log.user] || 0) + 1; });

    const structurizrWorkspacesByUser: { [user: string]: number } = {};
    structurizrLogs.forEach(log => { structurizrWorkspacesByUser[log.eonid] = (structurizrWorkspacesByUser[log.eonid] || 0) + 1; });

    const allUsers = new Set([...Object.keys(c4tsHitsByUser), ...Object.keys(structurizrWorkspacesByUser)]);

    const consolidatedData: UserData[] = Array.from(allUsers).map(user => ({
        id: user,
        name: user,
        department: 'N/A', // Department data is not available in these logs
        c4tsApiHits: c4tsHitsByUser[user] || 0,
        structurizrWorkspaces: structurizrWorkspacesByUser[user] || 0,
    }));
    
    // Sort by a combined activity metric to find the "top" users across systems
    return consolidatedData
        .sort((a, b) => ((b.c4tsApiHits || 0) + (b.structurizrWorkspaces || 0)) - ((a.c4tsApiHits || 0) + (a.structurizrWorkspaces || 0)))
        .slice(0, 5); // Return the top 5
};