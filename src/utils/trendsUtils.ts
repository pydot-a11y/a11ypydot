// src/utils/trendUtils.ts

import { Trend } from '../types/common'; // Adjust path if needed

/**
 * Calculates the percentage change between two numbers and determines the trend direction.
 * @param current - The value for the current period.
 * @param previous - The value for the previous period.
 * @returns A Trend object with the percentage value and direction.
 */
export const calculateTrend = (current: number, previous: number): Trend => {
  if (previous === 0) {
    // If the previous period had zero activity, any new activity is a significant increase.
    return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }

  const percentageChange = ((current - previous) / previous) * 100;

  // We only show a direction if the change is meaningful (e.g., more than 0.1%)
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral',
  };
};