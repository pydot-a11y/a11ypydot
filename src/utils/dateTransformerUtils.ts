
import { UserData } from '../types/common';

import { format, eachDayOfInterval, startOfDay, parseISO } from 'date-fns';
import { RawApiLog, RawStructurizrLog, DataPoint, CategoricalChartData, ApiEndpointData, MultiLineDataPoint } from '../types/analytics';

// --- NEW: A Universal Date Getter Helper ---
// This function knows how to find the date string regardless of the log type.
const getLogDateString = (log: RawApiLog | RawStructurizrLog): string | undefined => {
  // Check for the new C4TS/Structurizr format first: `created_at`
  if ((log as any).created_at) {
    return (log as any).created_at;
  }
  // Fallback for the original C4TS format: `createdAt`
  if ((log as RawApiLog).createdAt) {
    return (log as RawApiLog).createdAt;
  }
  // Fallback for the old Structurizr format: `createdAt: { $date: "..." }`
  if ((log as RawStructurizrLog).createdAt?.$date) {
    return (log as RawStructurizrLog).createdAt?.$date;
  }
  // If no date is found, return undefined
  return undefined;
};


// --- C4TS TRANSFORMERS (Corrected to use the helper) ---

export const transformC4TSLogsToTimeSeries = (logs: RawApiLog[]): DataPoint[] => {
  if (!logs || logs.length === 0) return [];
  const hitsByDay: { [date: string]: number } = {};

  logs.forEach(log => {
    const dateString = getLogDateString(log);
    if (dateString) {
      try {
        const day = format(startOfDay(parseISO(dateString)), 'yyyy-MM-dd');
        hitsByDay[day] = (hitsByDay[day] || 0) + 1;
      } catch (e) { /* Safely ignore invalid date strings */ }
    }
  });
  
  if (Object.keys(hitsByDay).length === 0) return [];

  const allDates = Object.keys(hitsByDay).map(d => new Date(d));
  const dateInterval = eachDayOfInterval({
    start: new Date(Math.min(...allDates.map(d => d.getTime()))),
    end: new Date(Math.max(...allDates.map(d => d.getTime()))),
  });

  return dateInterval.map(date => ({
    date: format(date, 'MMM d'),
    value: hitsByDay[format(date, 'yyyy-MM-dd')] || 0,
  }));
};



export const transformC4TSLogsToTopUsers = (logs: RawApiLog[], topN: number = 6): CategoricalChartData[] => {
  if (!logs) return [];
  const hitsByUser: { [user: string]: number } = {};
  logs.forEach(log => { hitsByUser[log.user] = (hitsByUser[log.user] || 0) + 1; });

  return Object.entries(hitsByUser)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
};

export const transformC4TSLogsToTopEndpoints = (logs: RawApiLog[], limit: number): ApiEndpointData[] => {
  if (!logs) return [];
  const hitsByUri: { [uri: string]: number } = {};
  logs.forEach(log => { hitsByUri[log.uri] = (hitsByUri[log.uri] || 0) + 1; });

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
    return logs.filter(log => log.archived !== true && log.deleted !== true).length;
};

export const extractStructurizrDistinctUsers = (logs: RawStructurizrLog[]): Set<string> => {
  if (!logs) return new Set();
  return new Set(logs.map(log => log.eonid));
};

// --- THIS IS THE MISSING FUNCTION ---
// --- REBUILD THIS FUNCTION WITH DETAILED LOGGING & NEW `created_at` FIELD ---
// --- STRUCTURIZR TRANSFORMERS (Corrected to use the helper) ---

export const transformStructurizrToCreationTrend = (logs: RawStructurizrLog[]): DataPoint[] => {
  if (!logs || logs.length === 0) return [];
  const createdByDay: { [date: string]: number } = {};

  logs.forEach(log => {
    const dateString = getLogDateString(log);
    if (dateString) {
      try {
        const day = format(startOfDay(parseISO(dateString)), 'yyyy-MM-dd');
        createdByDay[day] = (createdByDay[day] || 0) + 1;
      } catch (e) { /* Safely ignore */ }
    }
  });
  
  if (Object.keys(createdByDay).length === 0) return [];

  const allDates = Object.keys(createdByDay).map(d => new Date(d));
  const dateInterval = eachDayOfInterval({ /* ... */ });

  return dateInterval.map(date => ({
    date: format(date, 'MMM d'),
    value: createdByDay[format(date, 'yyyy-MM-dd')] || 0,
  }));
};

export const transformStructurizrToMultiLineTrend = (logs: RawStructurizrLog[]): MultiLineDataPoint[] => {
  if (!logs || logs.length === 0) return [];
  const dailyActivity: { [date: string]: { created: number; deleted: number; } } = {};

  logs.forEach(log => {
    const dateString = getLogDateString(log);
    if (dateString) {
      const day = format(startOfDay(parseISO(dateString)), 'yyyy-MM-dd');
      if (!dailyActivity[day]) {
        dailyActivity[day] = { created: 0, deleted: 0 };
      }
      dailyActivity[day].created++;
      if (log.deleted === true) {
        dailyActivity[day].deleted++;
      }
    }
  });

  const allDates = Object.keys(dailyActivity).map(d => new Date(d));
  if (allDates.length === 0) return [];
  const dateInterval = eachDayOfInterval({ /* ... */ });

  let activeCount = 0;
  return dateInterval.map(date => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const activity = dailyActivity[dayKey] || { created: 0, deleted: 0 };
    activeCount += (activity.created - activity.deleted);
    return {
      date: format(date, 'MMM d'),
      created: activity.created,
      deleted: activity.deleted,
      active: activeCount,
    };
  });
};


export const transformStructurizrToAccessMethods = (logs: RawStructurizrLog[]): CategoricalChartData[] => {
    if (!logs) return [];
    const countByInstance: { [instance: string]: number } = {};
    logs.forEach(log => { countByInstance[log.instance] = (countByInstance[log.instance] || 0) + 1; });
    
    const colors = ['#2563eb', '#ea580c', '#dc2626', '#10b981', '#f97316'];
    
    return Object.entries(countByInstance).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
    }));
};
// src/utils/dataTransformer.ts

// ... (all the other existing transform functions like transformStructurizrToMultiLineTrend, etc.)

// --- ADD THIS MISSING FUNCTION ---
export const transformStructurizrToTopUsers = (logs: RawStructurizrLog[], topN: number = 6): CategoricalChartData[] => {
  if (!logs) return [];
  const workspacesByUser: { [user: string]: number } = {};

  logs.forEach(log => {
      // Use the 'eonid' field as the user identifier for Structurizr logs
      const user = log.eonid;
      workspacesByUser[user] = (workspacesByUser[user] || 0) + 1;
  });

  return Object.entries(workspacesByUser)
      .map(([name, value]) => ({
          name,
          value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
};
// --- END OF ADDED FUNCTION ---

// ... (other functions like transformToTopUsersAcrossSystems)
// ==========================================================
// == CONSOLIDATED TRANSFORMERS (ACROSS SYSTEMS)
// ==========================================================

export const transformToTopUsersAcrossSystems = (c4tsLogs: RawApiLog[], structurizrLogs: RawStructurizrLog[]): UserData[] => {
    const c4tsHitsByUser: { [user: string]: number } = {};
    (c4tsLogs || []).forEach(log => { c4tsHitsByUser[log.user] = (c4tsHitsByUser[log.user] || 0) + 1; });

    const structurizrWorkspacesByUser: { [user: string]: number } = {};
    (structurizrLogs || []).forEach(log => { structurizrWorkspacesByUser[log.eonid] = (structurizrWorkspacesByUser[log.eonid] || 0) + 1; });

    const allUsers = new Set([...Object.keys(c4tsHitsByUser), ...Object.keys(structurizrWorkspacesByUser)]);

    const consolidatedData: UserData[] = Array.from(allUsers).map(user => ({
        id: user,
        name: user,
        department: 'N/A',
        c4tsApiHits: c4tsHitsByUser[user] || 0,
        structurizrWorkspaces: structurizrWorkspacesByUser[user] || 0,
    }));
    
    return consolidatedData
        .sort((a, b) => ((b.c4tsApiHits || 0) + (b.structurizrWorkspaces || 0)) - ((a.c4tsApiHits || 0) + (a.structurizrWorkspaces || 0)))
        .slice(0, 5);
};