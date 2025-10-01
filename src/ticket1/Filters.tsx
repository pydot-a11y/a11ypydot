// src/constants/Filters.tsx

// ... (import FilterOption and other types at the top)

// --- ADD THESE NEW CONSTANTS ---
export const ENVIRONMENT_OPTIONS: FilterOption[] = [
    { id: 'ALL', label: 'All Environments' },
    { id: 'DEV', label: 'Dev' },
    { id: 'QA', label: 'QA' },
    { id: 'PROD', label: 'Prod' },
  ];
  
  export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = 'ALL';
  // --- END NEW CONSTANTS ---
  
  // --- EXISTING DEFAULTS ---
  export const DEFAULT_TIMEFRAME_ID: TimeframeId = 'all-time';
  export const DEFAULT_USER_ID: UserId = 'ALL_USERS';
  export const DEFAULT_REGION_ID: RegionId = 'ALL_REGIONS';