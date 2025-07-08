// src/hooks/c4tsQueries.ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchC4TSPageStats,
  fetchC4TSApiHitsChartData,
  fetchC4TSTopUsersChartData,
  fetchC4TSApiHitsUrlTable,
  StatItem,
  ChartDataPointDateCount,
  UserActivityChartDataPoint,
  C4TSApiHitURLRow,
  FilterParams
} from '../services/apiService';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useGetC4TSPageStats = (filters?: FilterParams) => {
  return useQuery<StatItem[], Error>({
    queryKey: ['c4tsPageStats', filters],
    queryFn: () => fetchC4TSPageStats(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetC4TSApiHitsChartData = (filters?: FilterParams) => {
  return useQuery<ChartDataPointDateCount[], Error>({
    queryKey: ['c4tsApiHitsChart', filters],
    queryFn: () => fetchC4TSApiHitsChartData(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetC4TSTopUsersChartData = () => {
  return useQuery<UserActivityChartDataPoint[], Error>({
    queryKey: ['c4tsTopUsersChart'],
    queryFn: fetchC4TSTopUsersChartData,
    staleTime: STALE_TIME,
  });
};

export const useGetC4TSApiHitsUrlTable = () => {
  return useQuery<C4TSApiHitURLRow[], Error>({
    queryKey: ['c4tsApiHitsUrlTable'],
    queryFn: fetchC4TSApiHitsUrlTable,
    staleTime: STALE_TIME,
  });
};