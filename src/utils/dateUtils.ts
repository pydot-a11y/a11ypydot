// src/utils/dateUtils.ts (Full Rebuilt Code)
import { subDays, subMonths, subYears, format, startOfToday, endOfToday } from 'date-fns';
import { TimeframeId } from '../types/common'; // Adjust path if needed

/**
 * Formats a Date object into the "MM-dd-yyyy" format required by your API
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'MM-dd-yyyy');
};

/**
 * Calculates start and end dates based on the timeframe ID from our filters
 */
export const getTimeframeDates = (timeframe: TimeframeId): { startDate: Date; endDate: Date } => {
  const endDate = endOfToday(); // Use end of today for all calculations

  switch (timeframe) {
    case 'day':
      // Last 24 hours from now is more accurate than subbing 1 day
      return { startDate: subDays(endDate, 1), endDate };
    case 'week':
      return { startDate: subDays(endDate, 7), endDate };
    case 'month':
      return { startDate: subMonths(endDate, 1), endDate };
    case 'quarter':
      // This should be the last 90 days
      return { startDate: subDays(endDate, 90), endDate };
    case 'year':
      return { startDate: subYears(endDate, 1), endDate };
    case 'all-time':
    default:
      // A 5-year range for 'all-time' is a reasonable default
      return { startDate: subYears(endDate, 5), endDate };
  }
};

/**
 * NEW: Calculates the date ranges for the current 3-month period and the previous 3-month period.
 * This is used for the trend calculation.
 */
export const getTrendCalculationPeriods = (): { currentPeriod: { startDate: Date; endDate: Date }; previousPeriod: { startDate: Date; endDate: Date } } => {
  const now = new Date();
  
  // Current period is the last 3 months
  const currentPeriodEndDate = endOfToday();
  const currentPeriodStartDate = subMonths(now, 3);
  
  // Previous period is the 3 months before that
  const previousPeriodEndDate = subDays(currentPeriodStartDate, 1);
  const previousPeriodStartDate = subMonths(previousPeriodEndDate, 3);
  
  return {
    currentPeriod: { startDate: currentPeriodStartDate, endDate: currentPeriodEndDate },
    previousPeriod: { startDate: previousPeriodStartDate, endDate: previousPeriodEndDate }
  };
};