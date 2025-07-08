// src/useAnalyticsQueries.ts
import { useQuery } from '@tanstack/react-query';
import { structurizrApi, c4Api } from './api';
import { 
  TimeRange, 
  WorkspaceAnalyticsFilters, 
  NewlyCreatedFilters,
  ActiveWorkspacesFilters,
  RecentWorkspacesFilters,
  C4WorkspaceFilters
} from './types';

// === Structurizr Query Hooks ===

// Hook for getting all structurizr workspaces
export const useStructurizrWorkspaces = () => {
  return useQuery({
    queryKey: ['structurizr', 'workspaces'],
    queryFn: structurizrApi.getAllWorkspaces,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

// Hook for getting structurizr analytics data
export const useStructurizrAnalytics = (filters: WorkspaceAnalyticsFilters) => {
  return useQuery({
    queryKey: ['structurizr', 'analytics', filters],
    queryFn: () => structurizrApi.getAnalytics(filters),
    keepPreviousData: true, // Show previous data while loading new data
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};

// Hook for getting structurizr workspace count
export const useStructurizrWorkspaceCount = (eonid?: number) => {
  return useQuery({
    queryKey: ['structurizr', 'count', { eonid }],
    queryFn: () => structurizrApi.getWorkspaceCount(eonid),
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting newly created structurizr workspaces count
export const useStructurizrNewlyCreatedCount = (filters: NewlyCreatedFilters = {}) => {
  return useQuery({
    queryKey: ['structurizr', 'newly-created-count', filters],
    queryFn: () => structurizrApi.getNewlyCreatedCount(filters),
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting active structurizr workspaces count
export const useStructurizrActiveCount = (filters: ActiveWorkspacesFilters = {}) => {
  return useQuery({
    queryKey: ['structurizr', 'active-count', filters],
    queryFn: () => structurizrApi.getActiveCount(filters),
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting recently created structurizr workspaces
export const useStructurizrRecentWorkspaces = (filters: RecentWorkspacesFilters = {}) => {
  return useQuery({
    queryKey: ['structurizr', 'recent-workspaces', filters],
    queryFn: () => structurizrApi.getRecentWorkspaces(filters),
    refetchInterval: 60 * 1000,
  });
};

// Dashboard data combining all structurizr queries
export const useStructurizrDashboardData = (
  timeRange: TimeRange = 'lastMonth',
  eonid?: number,
  activityDays: number = 45,
  newlyCreatedHours: number = 24
) => {
  const workspacesQuery = useStructurizrWorkspaces();
  
  const analyticsQuery = useStructurizrAnalytics({
    range: timeRange,
    eonid,
  });
  
  const countQuery = useStructurizrWorkspaceCount(eonid);
  
  const newlyCreatedQuery = useStructurizrNewlyCreatedCount({
    hours: newlyCreatedHours,
    eonid,
  });
  
  const activeQuery = useStructurizrActiveCount({
    days: activityDays,
    eonid,
  });
  
  const recentQuery = useStructurizrRecentWorkspaces({
    limit: 5,
    eonid,
  });
  
  return {
    workspaces: workspacesQuery.data || [],
    analyticsData: analyticsQuery.data || [],
    workspaceCount: countQuery.data || 0,
    newlyCreatedCount: newlyCreatedQuery.data || 0,
    activeCount: activeQuery.data || 0,
    recentWorkspaces: recentQuery.data || [],
    isLoading: {
      workspaces: workspacesQuery.isLoading,
      analytics: analyticsQuery.isLoading,
      count: countQuery.isLoading,
      newlyCreated: newlyCreatedQuery.isLoading,
      active: activeQuery.isLoading,
      recent: recentQuery.isLoading,
    },
    isFetching: {
      workspaces: workspacesQuery.isFetching,
      analytics: analyticsQuery.isFetching,
      count: countQuery.isFetching,
      newlyCreated: newlyCreatedQuery.isFetching,
      active: activeQuery.isFetching,
      recent: recentQuery.isFetching,
    },
    error: 
      workspacesQuery.error || 
      analyticsQuery.error || 
      countQuery.error ||
      newlyCreatedQuery.error ||
      activeQuery.error ||
      recentQuery.error,
  };
};

// === C4 Model Query Hooks ===

// Hook for getting all C4 workspaces
export const useC4Workspaces = () => {
  return useQuery({
    queryKey: ['c4', 'workspaces'],
    queryFn: c4Api.getAllWorkspaces,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Hook for getting C4 analytics
export const useC4Analytics = (filters: C4WorkspaceFilters) => {
  return useQuery({
    queryKey: ['c4', 'analytics', filters],
    queryFn: () => c4Api.getAnalytics(filters),
    keepPreviousData: true,
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting C4 workspace count
export const useC4WorkspaceCount = (owner?: string) => {
  return useQuery({
    queryKey: ['c4', 'count', { owner }],
    queryFn: () => c4Api.getWorkspaceCount(owner),
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting most viewed C4 workspaces
export const useC4MostViewedWorkspaces = (limit: number = 5) => {
  return useQuery({
    queryKey: ['c4', 'most-viewed', { limit }],
    queryFn: () => c4Api.getMostViewedWorkspaces(limit),
    refetchInterval: 60 * 1000,
  });
};

// Hook for getting recent C4 workspaces
export const useC4RecentWorkspaces = (limit: number = 5) => {
  return useQuery({
    queryKey: ['c4', 'recent', { limit }],
    queryFn: () => c4Api.getRecentWorkspaces(limit),
    refetchInterval: 60 * 1000,
  });
};

// C4 dashboard data hook
export const useC4DashboardData = (
  timeRange: TimeRange = 'lastMonth',
  owner?: string
) => {
  const workspacesQuery = useC4Workspaces();
  
  const analyticsQuery = useC4Analytics({
    range: timeRange,
    owner,
  });
  
  const countQuery = useC4WorkspaceCount(owner);
  
  const mostViewedQuery = useC4MostViewedWorkspaces(5);
  
  const recentQuery = useC4RecentWorkspaces(5);
  
  return {
    workspaces: workspacesQuery.data || [],
    analyticsData: analyticsQuery.data || [],
    workspaceCount: countQuery.data || 0,
    mostViewedWorkspaces: mostViewedQuery.data || [],
    recentWorkspaces: recentQuery.data || [],
    isLoading: {
      workspaces: workspacesQuery.isLoading,
      analytics: analyticsQuery.isLoading,
      count: countQuery.isLoading,
      mostViewed: mostViewedQuery.isLoading,
      recent: recentQuery.isLoading,
    },
    isFetching: {
      workspaces: workspacesQuery.isFetching,
      analytics: analyticsQuery.isFetching,
      count: countQuery.isFetching,
      mostViewed: mostViewedQuery.isFetching,
      recent: recentQuery.isFetching,
    },
    error: 
      workspacesQuery.error || 
      analyticsQuery.error || 
      countQuery.error ||
      mostViewedQuery.error ||
      recentQuery.error,
  };
};