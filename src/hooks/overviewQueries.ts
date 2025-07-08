// src/hooks/overviewQueries.ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchOverviewStats,
  fetchOverviewC4TSChartData,
  fetchOverviewStructurizrChartData,
  fetchOverviewTopUsersTable,
  StatItem,
  ChartDataPointDateCount,
  StructurizrChartDataPoint,
  OverviewUserTableRow,
  FilterParams
} from '../services/apiService';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useGetOverviewStats = (filters?: FilterParams) => {
  return useQuery<StatItem[], Error>({
    queryKey: ['overviewStats', filters],
    queryFn: () => fetchOverviewStats(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetOverviewC4TSChartData = (filters?: FilterParams) => {
  return useQuery<ChartDataPointDateCount[], Error>({
    queryKey: ['overviewC4TSChart', filters],
    queryFn: () => fetchOverviewC4TSChartData(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetOverviewStructurizrChartData = (filters?: FilterParams) => {
  return useQuery<StructurizrChartDataPoint[], Error>({
    queryKey: ['overviewStructurizrChart', filters],
    queryFn: () => fetchOverviewStructurizrChartData(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetOverviewTopUsersTable = () => {
  return useQuery<OverviewUserTableRow[], Error>({
    queryKey: ['overviewTopUsersTable'],
    queryFn: fetchOverviewTopUsersTable,
    staleTime: STALE_TIME,
  });
};