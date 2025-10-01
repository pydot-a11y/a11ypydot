// src/types/common.ts

// --- ADD THIS NEW TYPE ---
export type EnvironmentId = string; // e.g., 'ALL', 'DEV', 'QA', 'PROD'

// ... (other types like TimeframeId, UserId, FilterOption)

// --- UPDATE THE ActiveFilters INTERFACE ---
export interface ActiveFilters {
  timeframe: TimeframeId;
  user: UserId;
  region: RegionId;
  environment: EnvironmentId; // Add the new environment property
}