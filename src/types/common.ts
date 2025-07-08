// src/types/common.ts

// --- Filter Value Types ---
// These define the actual data type of a selected filter value.
export type TimeframeId = 'all-time' | 'year' | 'quarter' | 'month' | 'week' | 'day';
export type UserId = string; // e.g., 'ETS', 'TOR', 'FIN', or 'ALL_DEPARTMENTS'
export type RegionId = string;     // e.g., 'NA', 'EU', 'APAC', or 'ALL_REGIONS'

// --- Filter Option Types (for dropdowns) ---
// These define the structure of objects used to populate select/dropdown options.
export interface FilterOption {
  id: string; // Will conform to TimeframeId, DepartmentId, or RegionId
  label: string;
}

// --- Active Filters State ---
// This is the structure of the state object that will hold the currently selected filter values.
export interface ActiveFilters {
  timeframe: TimeframeId;
  user: UserId;
  region: RegionId;
}


// --- Other Common Types (Keep these as they are useful) ---
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