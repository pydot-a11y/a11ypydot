// src/pages/C4TSAnalytics.tsx

// --- IMPORTS (Assume these are at the top of your file) ---
// Please ensure you have these specific imports for the new logic:
// import { differenceInDays, subDays } from 'date-fns';
// import { calculateTrend } from '../utils/trendUtils';
// import { extractC4TSDistinctUsers } from '../utils/dataTransformer';

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
}

const C4TSAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);
  const INITIAL_VISIBLE_ENDPOINTS = 5;

  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single query fetches all raw C4TS log data for the selected timeframe.
  // The line chart, main bar chart, and table are all derived from this single source.
  const { data: rawLogs, isLoading, error } = useQuery<RawApiLog[], Error>({
    queryKey: ['c4tsRawLogs', activeFilters.timeframe],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawC4TSLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // --- 2. DEDICATED TREND QUERY ---
  // This separate, background query fetches the data needed ONLY for the trend calculation
  // on the "Top Users" card. This prevents the main UI from being blocked.
  const { data: topUsersTrend } = useQuery<Trend, Error>({
    queryKey: ['c4tsTopUsersTrend', activeFilters], // Refetch when any filter changes
    queryFn: async () => {
      // a. Get the date range for the currently selected period.
      const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
      // b. Calculate the immediately preceding period of the same length.
      const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });

      // c. Fetch data for both periods in parallel.
      const [currentLogs, previousLogs] = await Promise.all([
        fetchRawC4TSLogsByDate(currentStart, currentEnd),
        fetchRawC4TSLogsByDate(previousPeriod.start, previousPeriod.end)
      ]);

      // d. Apply the user filter to both datasets.
      const filterByUser = (logs: RawApiLog[]) => activeFilters.user !== 'ALL_USERS' ? logs.filter(log => log.user === activeFilters.user) : logs;
      
      const currentUsersCount = extractC4TSDistinctUsers(filterByUser(currentLogs)).size;
      const previousUsersCount = extractC4TSDistinctUsers(filterByUser(previousLogs)).size;
      
      // e. Return the calculated trend.
      return calculateTrend(currentUsersCount, previousUsersCount);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- 3. DERIVED DATA using useMemo ---
  // These transformations are based on the master `rawLogs` query and are very fast.
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    if (activeFilters.user === 'ALL_USERS') return rawLogs;
    return rawLogs.filter(log => log.user === activeFilters.user);
  }, [rawLogs, activeFilters.user]);

  const apiHitsData = useMemo(() => transformC4TSLogsToTimeSeries(filteredLogs), [filteredLogs]);
  const topUsersChartData = useMemo(() => transformC4TSLogsToTopUsers(filteredLogs, 6), [filteredLogs]);
  const topEndpointsData = useMemo(() => transformC4TSLogsToTopEndpoints(filteredLogs, 50), [filteredLogs]);
  const visibleEndpoints = useMemo(() => showAllEndpoints ? topEndpointsData : topEndpointsData.slice(0, INITIAL_VISIBLE_ENDPOINTS), [topEndpointsData, showAllEndpoints]);

  const apiHitsUrlColumns: ColumnDef<ApiEndpointData>[] = useMemo(() => [
    { header: 'API URL', accessorKey: 'url', tdClassName: 'font-medium text-gray-900' },
    { header: 'Number of Hits', accessorKey: 'hits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  const c4tsApiHitsPeakInfoProvider = (point: DataPoint): string | null => {
    if (apiHitsData && point.value > 0 && point.value === Math.max(...apiHitsData.map(p => p.value))) {
      return `${point.value} Hits\nPeak Activity`;
    }
    return null;
  };

  // --- 4. RENDER LOGIC ---
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading C4TS Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;

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
            {/* The trend display is now fully dynamic */}
            {topUsersTrend && (
              <span className={`text-sm font-medium flex items-center ${
                topUsersTrend.direction === 'up' ? 'text-green-600' : 
                topUsersTrend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {/* Your SVG icon can be conditionally rendered here based on direction */}
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
              {showAllEndpoints ? 'Show Less' : 'See All'} →
            </button>
          )}
        </div>
        <TableComponent columns={apiHitsUrlColumns} data={visibleEndpoints} getRowKey="id" noDataMessage="No API hit data by URL to display." />
      </div>
    </div>
  );
};

export default C4TSAnalytics;