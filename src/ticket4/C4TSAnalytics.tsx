// src/pages/C4TSAnalytics.tsx

// --- IMPORTS (Ensure these are at the top of your file) ---
// import { fetchAllC4TSLogs } from '../services/apiService';
// import { getPeriodsForTrend } from '../utils/dateUtils';
// import { calculateTrend } from '../utils/trendUtils';
// import { extractC4TSDistinctUsers } from '../utils/dataTransformer';

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

  if (!outletContext) { /* ... guard clause ... */ }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- 1. MASTER DATA QUERY (Updated to use aggregator) ---
  const { data: rawLogs, isLoading, error, dataUpdatedAt } = useQuery<RawApiLog[], Error>({
    // The query key is static as we always fetch all envs for the necessary trend period.
    queryKey: ['c4tsPageAllEnvsData'],
    queryFn: () => {
      const { currentPeriod, previousPeriod } = getPeriodsForTrend(activeFilters.timeframe);
      // Fetch data for both current and previous periods to handle trends.
      return fetchAllC4TSLogs(previousPeriod.start, currentPeriod.end);
    },
  });

  // --- 2. DYNAMIC FOOTER UPDATE ---
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);

  // --- 3. DERIVED DATA using useMemo (Updated with environment filter) ---
  const pageData = useMemo(() => {
    if (!rawLogs) return null;

    // A. Filter by Environment first
    const filteredByEnv = activeFilters.environment === 'ALL'
        ? rawLogs
        : rawLogs.filter(log => log.environment === activeFilters.environment);
        
    // B. Then filter by User
    const filteredByUser = activeFilters.user !== 'ALL_USERS'
        ? filteredByEnv.filter(log => log.user === activeFilters.user)
        : filteredByEnv;

    // C. Slice for the selected timeframe
    const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
    const selectedTimeframeLogs = filteredByUser.filter(log => isWithinInterval(parseISO((log.created_at || log.createdAt)!), { start: startDate, end: endDate }));

    // D. Transform for UI components
    return {
        apiHitsData: transformC4TSLogsToTimeSeries(selectedTimeframeLogs),
        topUsersChartData: transformC4TSLogsToTopUsers(selectedTimeframeLogs, 6),
        topEndpointsData: transformC4TSLogsToTopEndpoints(selectedTimeframeLogs, 50),
    };
  }, [rawLogs, activeFilters]);

  // --- 4. DEDICATED TREND QUERY (No change from before) ---
  const { data: topUsersTrend } = useQuery<Trend, Error>({
    queryKey: ['c4tsTopUsersTrend', activeFilters],
    queryFn: async () => { /* ... same trend logic as before ... */ },
  });

  const visibleEndpoints = useMemo(() => {
      if (!pageData) return [];
      return showAllEndpoints ? pageData.topEndpointsData : pageData.topEndpointsData.slice(0, INITIAL_VISIBLE_ENDPOINTS);
  }, [pageData, showAllEndpoints]);

  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [ /* ... */ ], []);

  // --- 5. RENDER LOGIC ---
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading C4TS Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  return (
    <div className="space-y-6">
      {/* API Hits Line Chart Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">API Hits</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          <SingleLineMetricChart data={pageData.apiHitsData} lineName="API Hits" lineColor="#2563eb" yAxisLabel={null} aspect={3} />
        </div>
      </div>

      {/* Top Users Bar Chart Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div></div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            {topUsersTrend && ( /* ... trend JSX ... */ )}
          </div>
          <div className="px-6 pb-6">
            <HorizontalBarChart data={pageData.topUsersChartData} barColor="#10b981" aspect={1.5} />
          </div>
        </div>
      </div>

      {/* API Hits (URL) Table Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Hits (URL)</h2>
          {pageData.topEndpointsData && pageData.topEndpointsData.length > INITIAL_VISIBLE_ENDPOINTS && (
            <button /* ... onClick ... */ >
              {showAllEndpoints ? 'Show Less' : 'See All'} &rarr;
            </button>
          )}
        </div>
        <TableComponent columns={apiHitsUrlColumns} data={visibleEndpoints} getRowKey="id" noDataMessage="No API hit data by URL to display." />
      </div>
    </div>
  );
};