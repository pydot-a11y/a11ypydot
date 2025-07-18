// src/utils/dateUtils.ts

import { subDays, subMonths, subYears, format, startOfToday, endOfToday, differenceInDays, addYears } from 'date-fns';
import { TimeframeId } from '../types/common';

/**
 * Formats a Date object into the "dd-MM-yyyy" format required by your API.
 */
export const formatDateForApi = (date: Date): string => {
  return format(date, 'dd-MM-yyyy');
};

/**
 * Calculates start and end dates based on the timeframe ID from our filters.
 */
export const getTimeframeDates = (timeframe: TimeframeId): { startDate: Date; endDate: Date } => {
  const endDate = endOfToday();
  switch (timeframe) {
    case 'day': return { startDate: subDays(endDate, 1), endDate };
    case 'week': return { startDate: subDays(endDate, 7), endDate };
    case 'month': return { startDate: subMonths(endDate, 1), endDate };
    case 'quarter': return { startDate: subDays(endDate, 90), endDate };
    case 'year': return { startDate: subYears(endDate, 1), endDate };
    case 'all-time':
    default:
      // Use a very large, fixed range for 'all-time' to ensure all data is captured.
      return { startDate: new Date('1970-01-01'), endDate: addYears(new Date(), 10) };
  }
};

/**
 * NEW, SMARTER FUNCTION:
 * Given a date range, calculates the immediately preceding date range of the same duration.
 * @param currentPeriod - An object with { start: Date, end: Date }.
 * @returns A new object with the preceding { start: Date, end: Date }.
 */
export const getPrecedingPeriod = (currentPeriod: { start: Date; end: Date }): { start: Date; end: Date } => {
    const durationInDays = differenceInDays(currentPeriod.end, currentPeriod.start);
    const end = subDays(currentPeriod.start, 1);
    const start = subDays(end, durationInDays);
    return { start, end };
};