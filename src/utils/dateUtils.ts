// src/utils/dateUtils.ts

import { subDays, subMonths, subYears, format, startOfToday, endOfToday, startOfYear, endOfYear } from 'date-fns';
import { TimeframeId } from '../types/common';

/**
 * Formats a Date object into the "dd-MM-yyyy" format required by your API.
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'dd-MM-yyyy');
};

/**
 * Calculates start and end dates based on the timeframe ID from our filters.
 * This is now the single source of truth for date ranges.
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
      // --- START OF FIX ---
      // For 'all-time', we now use a very large range to guarantee all dev data is included.
      // A start date of the year 1970 and an end date 10 years in the future.
      return {
        startDate: new Date('1970-01-01'),
        endDate: addYears(new Date(), 10),
      };
      // --- END OF FIX ---
  }
};

/**
 * Calculates the date ranges for the current 3-month period and the previous 3-month period
 * for trend calculations.
 */
export const getTrendCalculationPeriods = (): { currentPeriod: { start: Date; end: Date }; previousPeriod: { start: Date; end: Date } } => {
  const now = new Date();
  
  const currentPeriodEndDate = endOfToday();
  const currentPeriodStartDate = subMonths(now, 3);
  
  const previousPeriodEndDate = subDays(currentPeriodStartDate, 1);
  const previousPeriodStartDate = subMonths(previousPeriodEndDate, 3);
  
  return {
    currentPeriod: {
        start: currentPeriodStartDate,
        end: currentPeriodEndDate,
    },
    previousPeriod: {
        start: previousPeriodStartDate,
        end: previousPeriodEndDate,
    }
  };
};

// We need to add this import at the top
// import { addYears } from 'date-fns';