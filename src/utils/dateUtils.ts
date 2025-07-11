// src/utils/dateUtils.ts
import { subDays, subMonths, subYears, format, endOfToday } from 'date-fns';
import { TimeframeId } from '../types/common'; // Adjust path if needed

// Formats a Date object into the "MM-dd-yyyy" format required by your API
export const formatDateForApi = (date: Date): string => {
  return format(date, 'MM-dd-yyyy');
};

// Calculates start and end dates based on the timeframe ID from our filters
export const getTimeframeDates = (timeframe: TimeframeId): { startDate: Date; endDate: Date } => {
  const endDate = endOfToday(); // Always end today

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
      // For 'all-time', use a fixed very old start date or as required by your API
      return { startDate: subYears(endDate, 5), endDate };
  }
};