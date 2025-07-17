// src/utils/dateUtils.ts (Full Rebuilt Code - Corrected)
import { subDays, subMonths, subYears, format, startOfToday, endOfToday } from 'date-fns';
import { TimeframeId } from '../types/common';

/**
 * Formats a Date object into the "dd-MM-yyyy" format required by your API
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'dd-MM-yyyy');
};

/**
 * Calculates start and end dates based on the timeframe ID from our filters
 */
export const getTimeframeDates = (timeframe: TimeframeId): { startDate: Date; endDate: Date } => {
  const endDate = endOfToday();

  switch (timeframe) {
    case 'day':
      return { startDate: subDays(endDate, 1), endDate };
    case 'week':
      return { startDate: subDays(endDate, 7), endDate };
    case 'month':
      return { startDate: subMonths(endDate, 1), endDate };
    case 'quarter':
      return { startDate: subDays(endDate, 90), endDate };
    case 'year':
      return { startDate: subYears(endDate, 1), endDate };
    case 'all-time':
    default:
      return { startDate: subYears(endDate, 3), endDate }; // Default to 3 years as requested
  }
};

/**
 * Calculates the date ranges for the current 3-month period and the previous 3-month period.
 * CORRECTED: Returns objects with 'start' and 'end' properties to match date-fns's Interval type.
 */
export const getTrendCalculationPeriods = (): { currentPeriod: { start: Date; end: Date }; previousPeriod: { start: Date; end: Date } } => {
  const now = new Date();
  
  // Current period is the last 3 months
  const currentPeriodEndDate = endOfToday();
  const currentPeriodStartDate = subMonths(now, 3);
  
  // Previous period is the 3 months before that
  const previousPeriodEndDate = subDays(currentPeriodStartDate, 1);
  const previousPeriodStartDate = subMonths(previousPeriodEndDate, 3);
  
  return {
    // --- START OF FIX ---
    currentPeriod: {
        start: currentPeriodStartDate,
        end: currentPeriodEndDate,
    },
    previousPeriod: {
        start: previousPeriodStartDate,
        end: previousPeriodEndDate,
    }
    // --- END OF FIX ---
  };
};