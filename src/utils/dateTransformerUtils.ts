// src/utils/dataTransformer.ts
import { format } from 'date-fns';
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
      const day = format(new Date(log.createdAt), 'yyyy-MM-dd');
      hitsByDay[day] = (hitsByDay[day] || 0) + 1;
    } catch (e) { console.warn('Invalid date format in C4TS log:', log.createdAt); }
  });
  return Object.entries(hitsByDay)
    .map(([date, value]) => ({ date: format(new Date(date), 'MMM d'), value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    // An entry is active if 'archived' is not true and 'deleted' is not true.
    return logs.filter(log => log.archived !== true && (log as any).deleted !== true).length;
};

export const extractStructurizrDistinctUsers = (logs: RawStructurizrLog[]): Set<string> => {
  if (!logs) return new Set();
  return new Set(logs.map(log => log.eonid));
};

export const transformStructurizrToMultiLineTrend = (logs: RawStructurizrLog[]): MultiLineDataPoint[] => {
    if (!logs) return [];
    const statsByDay: { [date: string]: { created: number; deleted: number; } } = {};

    logs.forEach(log => {
        if (log.createdAt?.$date) {
            try {
                const day = format(new Date(log.createdAt.$date), 'yyyy-MM-dd');
                if (!statsByDay[day]) {
                    statsByDay[day] = { created: 0, deleted: 0 };
                }
                statsByDay[day].created++;
                if ((log as any).deleted === true) {
                    statsByDay[day].deleted++;
                }
            } catch (e) { console.warn('Invalid date format in Structurizr log:', log.createdAt); }
        }
    });

    let activeCount = 0; // We need a running total for active workspaces
    return Object.entries(statsByDay)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, dailyStats]) => {
            // This is a simplified 'active' count. A true count would need the full history.
            // This represents the net change from the start of the period.
            activeCount += (dailyStats.created - dailyStats.deleted);
            return {
                date: format(new Date(date), 'MMM d'),
                created: dailyStats.created,
                deleted: dailyStats.deleted,
                active: activeCount, // This active count is relative to the start of the fetched period
            };
        });
};

export const transformStructurizrToAccessMethods = (logs: RawStructurizrLog[]): CategoricalChartData[] => {
    if (!logs) return [];
    const countByInstance: { [instance: string]: number } = {};
    logs.forEach(log => { countByInstance[log.instance] = (countByInstance[log.instance] || 0) + 1; });
    
    // You can define colors here or pass them in
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
        name: user, // Assuming eonid is the name for now
        department: 'N/A', // We don't have department data from these logs
        c4tsApiHits: c4tsHitsByUser[user] || 0,
        structurizrWorkspaces: structurizrWorkspacesByUser[user] || 0,
    }));
    
    // Sort by a combined metric, e.g., total hits + workspaces, and take top 5
    return consolidatedData
        .sort((a, b) => (b.c4tsApiHits! + b.structurizrWorkspaces!) - (a.c4tsApiHits! + a.structurizrWorkspaces!))
        .slice(0, 5);
};