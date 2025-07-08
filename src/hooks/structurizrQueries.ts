// src/hooks/structurizrQueries.ts
import { useQuery } from '@tanstack/react-query';
import {
  fetchStructurizrPageStats,
  fetchStructurizrWorkspaceCreationChartData,
  fetchStructurizrAccessMethodsData,
  fetchStructurizrTopUsersChartData,
  StatItem,
  StructurizrChartDataPoint,
  StructurizrAccessMethodData,
  UserActivityChartDataPoint,
  FilterParams,
  fetchRawStructurizrWorkspaces, // Add this import
  StructurizrWorkspaceRaw,  
} from '../services/apiService';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useGetRawStructurizrWorkspaces = (filters?: FilterParams) => {
    return useQuery<StructurizrWorkspaceRaw[], Error>({
      queryKey: ['rawStructurizrWorkspaces', filters],
      queryFn: () => fetchRawStructurizrWorkspaces(filters),
      staleTime: STALE_TIME,
    });
  }; 

export const useGetStructurizrPageStats = (filters?: FilterParams) => {
  return useQuery<StatItem[], Error>({
    queryKey: ['structurizrPageStats', filters],
    queryFn: () => fetchStructurizrPageStats(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetStructurizrWorkspaceCreationChartData = (filters?: FilterParams) => {
  return useQuery<StructurizrChartDataPoint[], Error>({
    queryKey: ['structurizrWorkspaceCreationChart', filters],
    queryFn: () => fetchStructurizrWorkspaceCreationChartData(filters),
    staleTime: STALE_TIME,
  });
};

export const useGetStructurizrAccessMethodsData = () => {
  return useQuery<StructurizrAccessMethodData, Error>({
    queryKey: ['structurizrAccessMethods'],
    queryFn: fetchStructurizrAccessMethodsData,
    staleTime: STALE_TIME,
  });
};

export const useGetStructurizrTopUsersChartData = () => {
  return useQuery<UserActivityChartDataPoint[], Error>({
    queryKey: ['structurizrTopUsersChart'],
    queryFn: fetchStructurizrTopUsersChartData,
    staleTime: STALE_TIME,
  });
};