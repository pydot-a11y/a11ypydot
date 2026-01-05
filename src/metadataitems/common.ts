export type TimeframeId = 'all-time' | 'year' | 'quarter' | 'month' | 'week' | 'day';
export type UserId = string;
export type RegionId = string;
export type EnvironmentId = string;

// ✅ NEW
export type DepartmentId = string;

export interface FilterOption {
  id: string;
  label: string;
}

export interface ActiveFilters {
  timeframe: TimeframeId;
  user: UserId;
  region: RegionId;
  environment: EnvironmentId;

  // ✅ NEW
  department: DepartmentId;
}

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon?: React.ElementType;
}

export interface Trend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface StatsCardDisplayData {
  title: string;
  value: string;
  trend?: Trend;
}

export interface UserData {
  id: string;
  name: string;
  department: string;
  c4tsApiHits?: number;
  structurizrWorkspaces?: number;
}

export interface ApiEndpointData {
  id: string;
  url: string;
  hits: number;
}