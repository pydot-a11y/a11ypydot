// src/utils/dataTransformer.ts

import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { RawApiLog, RawStructurizrLog, DataPoint, CategoricalChartData, ApiEndpointData, MultiLineDataPoint } from '../types/analytics';
import { UserData } from '../types/common';

// ==========================================================
// == C4TS TRANSFORMERS
// ==========================================================

// --- REBUILD THIS FUNCTION WITH DETAILED LOGGING ---
export const transformC4TSLogsToTimeSeries = (logs: RawApiLog[]): DataPoint[] => {
  console.log("--- [Transformer] transformC4TSLogsToTimeSeries: Received", logs?.length, "logs.");
  if (!logs || logs.length === 0) return [];

  const hitsByDay: { [date: string]: number } = {};
  
  logs.forEach((log, index) => {
    // Log each individual log entry to check its structure
    if (index < 5) { // Only log the first 5 to avoid spamming the console
      console.log(`[Transformer] C4TS Log #${index}:`, log);
    }
    
    // Check if the createdAt field exists before trying to parse it
    if (log.createdAt) {
      try {
        const date = startOfDay(parseISO(log.createdAt));
        // Check if the parsed date is valid
        if (!isNaN(date.getTime())) {
          const dayKey = format(date, 'yyyy-MM-dd');
          hitsByDay[dayKey] = (hitsByDay[dayKey] || 0) + 1;
        } else {
          console.warn(`[Transformer] C4TS Log #${index} had an invalid date string:`, log.createdAt);
        }
      } catch (e) {
        console.error(`[Transformer] C4TS Log #${index} failed to parse date:`, log.createdAt, e);
      }
    } else {
        console.warn(`[Transformer] C4TS Log #${index} is missing the 'createdAt' field.`);
    }
  });

  console.log("[Transformer] C4TS hits grouped by day:", hitsByDay);
  
  if (Object.keys(hitsByDay).length === 0) {
    console.log("[Transformer] No valid dates were found to group by. Returning empty array.");
    return [];
  }

  // ... (The rest of the function for filling in gaps remains the same)
  const allDates = Object.keys(hitsByDay).map(d => new Date(d));
  const dateInterval = eachDayOfInterval({
    start: new Date(Math.min(...allDates.map(d => d.getTime()))),
    end: new Date(Math.max(...allDates.map(d => d.getTime()))),
  });

  const finalData = dateInterval.map(date => {
    const dayKey = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'MMM d'),
      value: hitsByDay[dayKey] || 0,
    };
  });
  
  console.log("[Transformer] C4TS final transformed data length:", finalData.length);
  return finalData;
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
export const transformStructurizrToCreationTrend = (logs: RawStructurizrLog[]): DataPoint[] => {
  console.log("--- [Transformer] transformStructurizrToCreationTrend: Received", logs?.length, "logs.");
  if (!logs || logs.length === 0) return [];

  const createdByDay: { [date: string]: number } = {};

  logs.forEach((log, index) => {
    // Log each individual log entry
    if (index < 5) {
      console.log(`[Transformer] Structurizr Log #${index}:`, log);
    }
    
    // Use the new top-level `created_at` field. It's much simpler!
    const dateString = (log as any).created_at; // Use `created_at` from your Postman screenshot

    if (dateString) {
      try {
        const date = startOfDay(parseISO(dateString));
        if (!isNaN(date.getTime())) {
          const dayKey = format(date, 'yyyy-MM-dd');
          createdByDay[dayKey] = (createdByDay[dayKey] || 0) + 1;
        } else {
          console.warn(`[Transformer] Structurizr Log #${index} had an invalid date string:`, dateString);
        }
      } catch (e) {
        console.error(`[Transformer] Structurizr Log #${index} failed to parse date:`, dateString, e);
      }
    } else {
        // Fallback to the old format just in case, for backwards compatibility
        const oldDateString = log.createdAt?.$date;
        if (oldDateString) {
            // ... (similar try/catch block for old format)
        } else {
            console.warn(`[Transformer] Structurizr Log #${index} is missing a creation date.`);
        }
    }
  });

  console.log("[Transformer] Structurizr creations grouped by day:", createdByDay);

  if (Object.keys(createdByDay).length === 0) {
    console.log("[Transformer] No valid dates were found to group by. Returning empty array.");
    return [];
  }

  // ... (The rest of the function for filling in gaps remains the same) ...
  const allDates = Object.keys(createdByDay).map(d => new Date(d));
  const dateInterval = eachDayOfInterval({
    start: new Date(Math.min(...allDates.map(d => d.getTime()))),
    end: new Date(Math.max(...allDates.map(d => d.getTime()))),
  });

  const finalData = dateInterval.map(date => {
    const dayKey = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'MMM d'),
      value: createdByDay[dayKey] || 0,
    };
  });
  
  console.log("[Transformer] Structurizr final transformed data length:", finalData.length);
  return finalData;
};

// --- END OF MISSING FUNCTION ---

export const transformStructurizrToMultiLineTrend = (logs: RawStructurizrLog[]): MultiLineDataPoint[] => {
    if (!logs || logs.length === 0) return [];

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

    const allDates = logs.filter(log => log.createdAt?.$date).map(log => startOfDay(new Date(log.createdAt!.$date)));
    if (allDates.length === 0) return [];

    const interval = eachDayOfInterval({
        start: new Date(Math.min(...allDates.map(d => d.getTime()))),
        end: new Date(Math.max(...allDates.map(d => d.getTime()))),
    });

    let activeCount = 0;
    return interval.map(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        const activity = dailyActivity[dayKey] || { created: 0, deleted: 0 };
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