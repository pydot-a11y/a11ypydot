import { FilterOption, TimeframeId, UserId, RegionId, EnvironmentId } from '../types/common';

// -------------------- Timeframe --------------------
export const TIMEFRAME_OPTIONS: FilterOption[] = [
  { id: 'all-time', label: 'All time' },
  { id: 'year', label: 'Last 12 months' },
  { id: 'quarter', label: 'Last 90 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'day', label: 'Last 24 hours' },
];

// export const DEPARTMENT_OPTIONS: FilterOption[] = [
//   { id: 'ALL_DEPARTMENTS', label: 'All Departments' },
//   { id: 'ETS', label: 'ETS' },
//   { id: 'TOR', label: 'TOR' },
//   { id: 'FIN', label: 'FIN' },
//   // Add other departments
// ];

// ✅ NEW: dynamic department dropdown still needs a stable “All” option + default id
export const ALL_DEPARTMENTS_OPTION: FilterOption = { id: 'ALL_DEPARTMENTS', label: 'All Departments' };
export const DEFAULT_DEPARTMENT_ID = 'ALL_DEPARTMENTS';

// -------------------- Users --------------------
export const ALL_USERS_OPTION: FilterOption = { id: 'ALL_USERS', label: 'All Users' };

// -------------------- Region --------------------
export const REGION_OPTIONS: FilterOption[] = [
  { id: 'ALL_REGIONS', label: 'All Regions' },
  { id: 'NA', label: 'North America' },
  { id: 'EU', label: 'Europe' },
  { id: 'APAC', label: 'Asia Pacific' },
];

// -------------------- Environment --------------------
export const ENVIRONMENT_OPTIONS: FilterOption[] = [
  { id: 'ALL', label: 'All Environments' },
  { id: 'DEV', label: 'Dev' },
  { id: 'QA', label: 'QA' },
  { id: 'PROD', label: 'Prod' },
];

export const ENVIRONMENTS_TO_FETCH: string[] = ['DEV', 'QA', 'PROD'];

// -------------------- Defaults --------------------
export const DEFAULT_ENVIRONMENT_ID: EnvironmentId = 'ALL';

export const DEFAULT_TIMEFRAME_ID: TimeframeId = 'all-time';
export const DEFAULT_USER_ID: UserId = 'ALL_USERS';
export const DEFAULT_REGION_ID: RegionId = 'ALL_REGIONS';