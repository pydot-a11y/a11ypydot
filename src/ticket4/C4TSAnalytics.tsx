// src/pages/C4TSAnalytics.tsx

// --- Helper Functions and Component Definition ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
}

const C4TSAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);
  const INITIAL_VISIBLE_ENDPOINTS = 5;

  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- 1. MASTER DATA QUERY (Corrected from your screenshot) ---
  const { data: rawLogs, isLoading, error, dataUpdatedAt } = useQuery<RawApiLog[], Error>({
    // CORRECTED: The queryKey now correctly includes the timeframe filter.
    // This ensures that when the user changes the timeframe, React Query will refetch the data.
    queryKey: ['c4tsRawLogs', activeFilters.timeframe],
    queryFn: () => {
      // UNCHANGED: The query function itself was correct.
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchAllC4TSLogs(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- 2. DEDICATED TREND QUERY (Slightly modified from your screenshot) ---
  const { data: topUsersTrend } = useQuery<Trend, Error>({
    queryKey: ['c4tsTopUsersTrend', activeFilters],
    queryFn: async () => {
      // CORRECTED: This logic is now simpler and more robust.
      if (activeFilters.timeframe === 'all-time') {
        return { value: 0, direction: 'neutral' };
      }
      const { currentPeriod, previousPeriod } = getPeriodsForTrend(activeFilters.timeframe);

      // We now fetch from all environments for the trend calculation.
      const [currentLogs, previousLogs] = await Promise.all([
        fetchAllC4TSLogs(currentPeriod.start, currentPeriod.end),
        fetchAllC4TSLogs(previousPeriod.start, previousPeriod.end)
      ]);

      // UNCHANGED: The rest of the trend calculation logic was correct.
      const filterByUser = (logs: RawApiLog[]) => activeFilters.user !== 'ALL_USERS' ? logs.filter(log => log.user === activeFilters.user) : logs;
      const currentUsersCount = extractC4TSDistinctUsers(filterByUser(currentLogs)).size;
      const previousUsersCount = extractC4TSDistinctUsers(filterByUser(previousLogs)).size;
      return calculateTrend(currentUsersCount, previousUsersCount);
    },
    staleTime: 1000 * 60 * 5,
  });
  
  // --- NEW: Added useEffect for the dynamic footer timestamp ---
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);

  // --- 3. DERIVED DATA using useMemo (Updated to include Environment filter) ---
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    
    // NEW: Add the environment filtering step at the beginning.
    const filteredByEnv = activeFilters.environment === 'ALL'
      ? rawLogs
      : rawLogs.filter(log => log.environment === activeFilters.environment);

    // UNCHANGED: The user filter now runs on the environment-filtered data.
    if (activeFilters.user === 'ALL_USERS') return filteredByEnv;
    return filteredByEnv.filter(log => log.user === activeFilters.user);
  }, [rawLogs, activeFilters]); // CORRECTED: Dependency array now includes all of activeFilters.

  // UNCHANGED: These transformers now correctly operate on the fully filtered data.
  const apiHitsData = useMemo(() => transformC4TSLogsToTimeSeries(filteredLogs), [filteredLogs]);
  const topUsersChartData = useMemo(() => transformC4TSLogsToTopUsers(filteredLogs, 6), [filteredLogs]);
  const topEndpointsData = useMemo(() => transformC4TSLogsToTopEndpoints(filteredLogs, 50), [filteredLogs]);
  const visibleEndpoints = useMemo(() => showAllEndpoints ? topEndpointsData : topEndpointsData.slice(0, INITIAL_VISIBLE_ENDPOINTS), [topEndpointsData, showAllEndpoints]);

  // UNCHANGED: Column definitions are correct.
  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [
    { header: 'API URL', accessorKey: 'url', tdClassName: 'font-medium text-gray-900' },
    { header: 'Number of Hits', accessorKey: 'hits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  // UNCHANGED: Peak info provider logic is correct.
  const c4tsApiHitsPeakInfoProvider = (point: DataPoint): string | null => {
    if (apiHitsData && apiHitsData.length > 0 && point.value === Math.max(...apiHitsData.map(p => p.value))) {
      return `${point.value} Hits\nPeak Activity`;
    }
    return null;
  };

  // --- 4. RENDER LOGIC ---
  
  // UNCHANGED: Loading and error states are correct.
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading C4TS Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;

  // UNCHANGED: The JSX structure is correct.
  return (
    <div className="space-y-6">
      {/* API Hits Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">API Hits</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          <SingleLineMetricChart data={apiHitsData} lineName="API Hits" lineColor="#2563eb" yAxisLabel={null} aspect={3} peakInfoProvider={c4tsApiHitsPeakInfoProvider} />
        </div>
      </div>

      {/* Top Users Bar Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div></div> {/* This empty div pushes the chart to the right */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            {/* UNCHANGED: The dynamic trend JSX is correct. */}
            {topUsersTrend && (
              <span className={`text-sm font-medium flex items-center ${
                topUsersTrend.direction === 'up' ? 'text-green-600' : 
                topUsersTrend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {/* Your SVG icon here */}
                {topUsersTrend.value.toFixed(1)}% vs prior period
              </span>
            )}
          </div>
          <div className="px-6 pb-6">
            <HorizontalBarChart data={topUsersChartData} barColor="#10b981" aspect={1.5} />
          </div>
        </div>
      </div>

      {/* API Hits (URL) Table Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Hits (URL)</h2>
          {topEndpointsData && topEndpointsData.length > INITIAL_VISIBLE_ENDPOINTS && (
            <button type="button" className="text-sm font-medium text-primary-600 hover:text-primary-500" onClick={() => setShowAllEndpoints(!showAllEndpoints)}>
              {showAllEndpoints ? 'Show Less' : 'See All'} &rarr;
            </button>
          )}
        </div>
        <TableComponent columns={apiHitsUrlColumns} data={visibleEndpoints} getRowKey="id" noDataMessage="No API hit data by URL to display." />
      </div>
    </div>
  );
};

export default C4TSAnalytics;