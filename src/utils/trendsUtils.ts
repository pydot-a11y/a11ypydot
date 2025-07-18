// src/utils/trendUtils.ts

import { Trend } from '../types/common'; // Adjust path if needed

/**
 * Calculates the percentage change between two numbers and determines the trend direction.
 * @param current - The value for the current period.
 * @param previous - The value for the previous period.
 * @returns A Trend object with the percentage value and direction ('up', 'down', 'neutral').
 */
export const calculateTrend = (current: number, previous: number): Trend => {
  if (previous === 0) {
    // If the previous value was 0, any increase is significant.
    // We can represent this as a 100% increase if the current value is positive.
    return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }

  const percentageChange = ((current - previous) / previous) * 100;

  // We consider a trend "neutral" if the change is very small (e.g., less than 0.1%)
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral',
  };
};