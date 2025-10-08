// src/utils/dateUtils.ts

// --- INSERT THIS ENTIRE FUNCTION at the bottom of the file ---

/**
 * Given a timeframe, calculates the current period AND the preceding period of the same length.
 * @param timeframe The TimeframeId selected by the user.
 * @returns An object containing the start/end dates for both the current and previous periods.
 */
export const getPeriodsForTrend = (timeframe: TimeframeId): {
    currentPeriod: { start: Date; end: Date };
    previousPeriod: { start: Date; end: Date };
  } => {
    const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(timeframe);
    
    // Calculate the duration of the selected timeframe in days
    const durationInDays = differenceInDays(currentEnd, currentStart);
  
    // The "previous" period is the period of the same duration right before the selected one
    const previousPeriod = {
        start: subDays(currentStart, durationInDays + 1),
        end: subDays(currentEnd, durationInDays + 1)
    };
    
    return {
      currentPeriod: { start: currentStart, end: currentEnd },
      previousPeriod
    };
  };

  // Replace the existing queryFn with this new one
queryFn: async () => {
    // a. Get the date range for the user's selection and the preceding period for trends
    const { currentPeriod, previousPeriod } = getPeriodsForTrend(activeFilters.timeframe);
    
    // b. Determine the widest possible date range we need to fetch to satisfy both periods
    const fetchStartDate = previousPeriod.start;
    const fetchEndDate = currentPeriod.end;
    
    // c. Fetch all the data we need in just two parallel calls
    const [c4tsLogs, structurizrLogs] = await Promise.all([
      fetchRawC4TSLogsByDate(fetchStartDate, fetchEndDate),
      fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
    ]);
    
    // d. Return all the raw data and the calculated periods for the next step
    return { c4tsLogs, structurizrLogs, currentPeriod, previousPeriod };
  },

  // Replace the existing useMemo block with this new one
const pageData = useMemo(() => {
    if (!allData) return null;
  
    const { c4tsLogs, structurizrLogs, currentPeriod, previousPeriod } = allData;
    
    // Apply the user filter to the master datasets
    const filterByUser = (logs: (RawApiLog | RawStructurizrLog)[], user: string) => {
        if (user === 'ALL_USERS') return logs;
        return logs.filter(log => (log as RawApiLog).user === user || (log as RawStructurizrLog).eonid === user);
    };
  
    const c4tsFiltered = filterByUser(c4tsLogs, activeFilters.user) as RawApiLog[];
    const structurizrFiltered = filterByUser(structurizrLogs, activeFilters.user) as RawStructurizrLog[];
  
    // Create a robust helper for filtering by date range
    const filterByDateRange = (logs: (RawApiLog | RawStructurizrLog)[], range: { start: Date; end: Date }) => {
      return logs.filter(log => {
        const dateString = (log as any).created_at || (log as any).createdAt;
        if (!dateString) return false;
        try {
          const date = parseISO(dateString);
          if (isNaN(date.getTime())) return false;
          return isWithinInterval(date, range);
        } catch { return false; }
      });
    };
    
    // Slice the user-filtered data into "current" and "previous" buckets
    const c4tsCurrent = filterByDateRange(c4tsFiltered, currentPeriod) as RawApiLog[];
    const c4tsPrevious = filterByDateRange(c4tsFiltered, previousPeriod) as RawApiLog[];
    const structurizrCurrent = filterByDateRange(structurizrFiltered, currentPeriod) as RawStructurizrLog[];
    const structurizrPrevious = filterByDateRange(structurizrFiltered, previousPeriod) as RawStructurizrLog[];
  
    // Handle the "All time" edge case for trends
    const isAllTime = activeFilters.timeframe === 'all-time';
    const neutralTrend: Trend = { value: 0, direction: 'neutral' };
  
    // Calculate all stats for the cards, applying the "All time" rule
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsCurrent.length, trend: isAllTime ? neutralTrend : calculateTrend(c4tsCurrent.length, c4tsPrevious.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrCurrent), trend: isAllTime ? neutralTrend : calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrent), getStructurizrActiveWorkspaceCount(structurizrPrevious)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractStructurizrDistinctUsers(structurizrCurrent).size, extractStructurizrDistinctUsers(structurizrPrevious).size) },
    };
  
    // Transform the "current" data slices for the UI components
    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsCurrent),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrCurrent),
        topUsersData: transformToTopUsersAcrossSystems(c4tsCurrent, structurizrCurrent),
    };
  }, [allData, activeFilters]);









  // NEW, CORRECTED queryFn
queryFn: async () => {
    // a. Get the date range for the user's selection (e.g., "All time")
    const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
    
    // b. --- THIS IS THE FIX ---
    // We initialize the variables first.
    let previousPeriod = { start: currentStart, end: currentEnd }; 
    let fetchStartDate = currentStart;
  
    // c. We ONLY calculate a preceding period if the timeframe is NOT 'all-time'.
    if (activeFilters.timeframe !== 'all-time') {
      previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
      fetchStartDate = previousPeriod.start;
    }
    // This `if` block prevents the invalid date calculation for the 'all-time' case.
    // --- END OF FIX ---
  
    const fetchEndDate = currentEnd;
    
    // d. This Promise.all now receives a VALID start date, even for 'all-time'.
    const [c4tsLogs, structurizrLogs] = await Promise.all([
      fetchAllC4TSLogs(fetchStartDate, fetchEndDate),
      fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
    ]);
    
    return { c4tsLogs, structurizrLogs, currentPeriod: { start: currentStart, end: currentEnd }, previousPeriod };
  },