// src/pages/StructurizrAnalytics.tsx

// --- IMPORTS (Ensure these are at the top of your file) ---
// Please ensure you have these specific imports for the new logic:
// import { differenceInDays, subDays } from 'date-fns';
// import { calculateTrend } from '../utils/trendUtils';
// import { extractStructurizrDistinctUsers } from '../utils/dataTransformer';

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
}

const StructurizrAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single query fetches all raw Structurizr log data for the selected timeframe.
  const { data: rawLogs, isLoading, error } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['structurizrRawLogs', activeFilters.timeframe],
    queryFn: () => {
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // --- 2. DEDICATED TREND QUERY for the "Top Users" card ---
  const { data: topUsersTrend } = useQuery<Trend, Error>({
    queryKey: ['structurizrTopUsersTrend', activeFilters],
    queryFn: async () => {
      const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
      const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });

      const [currentLogs, previousLogs] = await Promise.all([
        fetchRawStructurizrLogsByDate(currentStart, currentEnd),
        fetchRawStructurizrLogsByDate(previousPeriod.start, previousPeriod.end)
      ]);

      const filterByUser = (logs: RawStructurizrLog[]) => activeFilters.user !== 'ALL_USERS' ? logs.filter(log => log.eonid === activeFilters.user) : logs;
      
      const currentUsersCount = extractStructurizrDistinctUsers(filterByUser(currentLogs)).size;
      const previousUsersCount = extractStructurizrDistinctUsers(filterByUser(previousLogs)).size;
      
      return calculateTrend(currentUsersCount, previousUsersCount);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- 3. DERIVED DATA using useMemo from the master query ---
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    if (activeFilters.user === 'ALL_USERS') return rawLogs;
    return rawLogs.filter(log => log.eonid === activeFilters.user);
  }, [rawLogs, activeFilters.user]);

  const workspacesTrendData: MultiLineDataPoint[] = useMemo(() => rawLogs ? transformStructurizrToMultiLineTrend(rawLogs) : [], [rawLogs]);
  const topUsersChartData: CategoricalChartData[] = useMemo(() => filteredLogs ? transformStructurizrToTopUsers(filteredLogs, 6) : [], [filteredLogs]);
  const accessMethodsData = useMemo(() => filteredLogs ? transformStructurizrToAccessMethods(filteredLogs) : [], [filteredLogs]);
  const donutChartAccessData: DonutChartDataItem[] = useMemo(() => accessMethodsData.map(d => ({...d, value: d.value})), [accessMethodsData]);
  
  // --- 4. RENDER LOGIC ---
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Structurizr Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* Structurizr Workspaces Multi-Line Chart Card (remains the same) */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Structurizr Workspaces</h2>
          <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
        </div>
        <div className="px-6 pb-6">
          <WorkspaceTrendChart data={workspacesTrendData} aspect={3} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Access Methods Card (remains the same) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">How workspaces are being accessed</h2>
          {accessMethodsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 h-48 md:h-full"><DonutChartComponent data={donutChartAccessData} aspect={1} innerRadius="60%" outerRadius="85%" showLegend={false} /></div>
              <div className="md:col-span-2">{/* ... table for access methods ... */}</div>
            </div>
          ) : ( <p className="text-center py-10 text-gray-500">No data available for access methods.</p> )}
        </div>

        {/* Top Users Bar Chart Card */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
            {/* THIS JSX IS NOW DYNAMIC and matches the StatsCard style */}
            {topUsersTrend && (
              <div className={`mt-2 flex items-baseline text-sm ${
                topUsersTrend.direction === 'up' ? 'text-green-600' :
                topUsersTrend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {topUsersTrend.direction === 'up' && (
                  <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {topUsersTrend.direction === 'down' && (
                   <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="ml-1">{topUsersTrend.value.toFixed(1)}%</span>
                <span className="ml-1 text-gray-500">vs prior period</span>
              </div>
            )}
          </div>
          <div className="px-6 pb-6">
            <HorizontalBarChart data={topUsersChartData} barColor="#4ade80" aspect={1.5} xAxisLabel="Workspaces Created" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructurizrAnalytics;