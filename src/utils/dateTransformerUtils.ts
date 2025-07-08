// src/utils/dataTransformer.ts
import { format } from 'date-fns';
import { RawApiLog, DataPoint, CategoricalChartData, ApiEndpointData } from '../types/analytics';

// Transforms logs into a time series for line charts (hits per day)
export const transformLogsToTimeSeries = (logs: RawApiLog[]): DataPoint[] => {
  if (!logs) return [];
  const hitsByDay: { [date: string]: number } = {};

  logs.forEach(log => {
    try {
      const day = format(new Date(log.createdAt), 'yyyy-MM-dd'); // Group by day
      hitsByDay[day] = (hitsByDay[day] || 0) + 1;
    } catch (e) {
      console.warn('Invalid date format in log:', log.createdAt);
    }
  });

  return Object.entries(hitsByDay)
    .map(([date, value]) => ({
      date: format(new Date(date), 'MMM d'), // Format for display, e.g., "Mar 23"
      value,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Transforms logs into top N users for bar charts
export const transformLogsToTopUsers = (logs: RawApiLog[], topN: number = 6): CategoricalChartData[] => {
  if (!logs) return [];
  const hitsByUser: { [user: string]: number } = {};

  logs.forEach(log => {
    const user = log.user;
    hitsByUser[user] = (hitsByUser[user] || 0) + 1;
  });

  return Object.entries(hitsByUser)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
};

// Transforms logs into top N endpoints for tables
export const transformLogsToTopEndpoints = (logs: RawApiLog[], topN: number = 10): ApiEndpointData[] => {
  if (!logs) return [];
  const hitsByUri: { [uri: string]: number } = {};

  logs.forEach(log => {
    const uri = log.uri;
    hitsByUri[uri] = (hitsByUri[uri] || 0) + 1;
  });

  return Object.entries(hitsByUri)
    .map(([url, hits], index) => ({
      id: `endpoint-${index}`,
      url,
      hits,
    }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, topN);
};

// Extracts a unique, sorted list of users (eonids) from logs
export const extractDistinctUsers = (logs: RawApiLog[]): string[] => {
  if (!logs) return [];
  const userSet = new Set(logs.map(log => log.user));
  return Array.from(userSet).sort();
};