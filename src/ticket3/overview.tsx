// src/pages/Overview.tsx

// --- IMPORTS (Ensure these are at the top) ---
// import { fetchAllC4TSLogs, fetchAllStructurizrLogs } from '../services/apiService';

// --- Helper Functions (No changes here) ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();
const calculateTrend = (current: number, previous: number): Trend => { /* ... */ };

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- 1. MASTER DATA QUERY (Updated to use aggregator functions) ---
  const { data: allEnvData, isLoading, error, dataUpdatedAt } = useQuery({
    // The query key is now static because we always fetch all environments' data for the necessary trend period.
    // The UI filters will be applied on the frontend.
    queryKey: ['overviewPageAllEnvsData'],
    queryFn: async () => {
      // Fetch the widest possible date range needed for trends (6 months).
      const { currentPeriod, previousPeriod } = getPeriodsForTrend('quarter'); // Using 'quarter' as a base for 6 months
      const fetchStartDate = previousPeriod.start;
      const fetchEndDate = currentPeriod.end;
      
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(fetchStartDate, fetchEndDate),
        fetchAllStructurizrLogs(fetchStartDate, fetchEndDate),
      ]);
      
      return { c4tsLogs, structurizrLogs };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // --- 2. DYNAMIC FOOTER UPDATE ---
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);

  // --- 3. DERIVED DATA USING useMemo (Updated with environment filter) ---
  const pageData = useMemo(() => {
    if (!allEnvData) return null;

    const { c4tsLogs, structurizrLogs } = allEnvData;
    
    // --- START OF NEW LOGIC ---
    // A. First, filter the entire raw dataset by the selected ENVIRONMENT.
    const c4tsFilteredByEnv = activeFilters.environment === 'ALL'
      ? c4tsLogs
      : c4tsLogs.filter(log => log.environment === activeFilters.environment);
      
    const structurizrFilteredByEnv = activeFilters.environment === 'ALL'
      ? structurizrLogs
      : structurizrLogs.filter(log => log.environment === activeFilters.environment);
    // --- END OF NEW LOGIC ---

    // B. Now, all subsequent filtering (by user, by date) uses these pre-filtered arrays.
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? c4tsFilteredByEnv.filter(log => log.user === activeFilters.user) : c4tsFilteredByEnv;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? structurizrFilteredByEnv.filter(log => log.eonid === activeFilters.user) : structurizrFilteredByEnv;
    
    // The rest of the calculation logic remains the same, but now operates on the correctly filtered data.
    const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
    const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
    
    const filterByDateRange = (logs: any[], range: { start: Date, end: Date }) => { /* ... */ };

    const c4tsCurrent = filterByDateRange(c4tsFilteredByUser, { start: currentStart, end: currentEnd });
    const c4tsPrevious = filterByDateRange(c4tsFilteredByUser, previousPeriod);
    const structurizrCurrent = filterByDateRange(structurizrFilteredByUser, { start: currentStart, end: currentEnd });
    const structurizrPrevious = filterByDateRange(structurizrFilteredByUser, previousPeriod);

    const isAllTime = activeFilters.timeframe === 'all-time';
    const neutralTrend: Trend = { value: 0, direction: 'neutral' };

    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsCurrent.length, trend: isAllTime ? neutralTrend : calculateTrend(c4tsCurrent.length, c4tsPrevious.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrCurrent), trend: isAllTime ? neutralTrend : calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrent), getStructurizrActiveWorkspaceCount(structurizrPrevious)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractStructurizrDistinctUsers(structurizrCurrent).size, extractStructurizrDistinctUsers(structurizrPrevious).size) },
    };

    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsCurrent),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrCurrent),
        topUsersData: transformToTopUsersAcrossSystems(c4tsCurrent, structurizrCurrent),
    };
  }, [allEnvData, activeFilters]);

  // ... (topUsersColumns definition remains the same)

  // --- 4. RENDER LOGIC ---
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading All Environment Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  // The final JSX rendering block remains the same, as it just consumes `pageData`.
  return (
    <div className="space-y-6">
      {/* ... JSX for StatsCard, SingleLineMetricChart, and TableComponent ... */}
    </div>
  );
};