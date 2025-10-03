// src/pages/C4TSAnalytics.tsx

// --- IMPORTS (Ensure these are at the top) ---
// import { fetchAllC4TSLogs } from '../services/apiService';

// --- Helper Functions and Component Definition ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();
interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
}

const C4TSAnalytics: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  const [showAllEndpoints, setShowAllEndpoints] = useState(false);
  
  if (!outletContext) { /* ... guard clause ... */ }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- MASTER DATA QUERY (Updated to use aggregator) ---
  const { data: rawLogs, isLoading, error, dataUpdatedAt } = useQuery<RawApiLog[], Error>({
    queryKey: ['c4tsPageAllEnvsData'],
    queryFn: () => {
      // Fetch a wide range of data to accommodate all timeframes
      const { startDate, endDate } = getTimeframeDates('year'); // Fetch last year of data
      return fetchAllC4TSLogs(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);
  
  // --- DEDICATED TREND QUERY (remains the same) ---
  const { data: topUsersTrend } = useQuery<Trend, Error>({
    queryKey: ['c4tsTopUsersTrend', activeFilters],
    queryFn: async () => { /* ... same trend logic as before ... */ },
  });

  // --- DERIVED DATA using useMemo (Updated with environment filter) ---
  const pageData = useMemo(() => {
    if (!rawLogs) return null;

    // 1. Filter by Environment
    const filteredByEnv = activeFilters.environment === 'ALL'
        ? rawLogs
        : rawLogs.filter(log => log.environment === activeFilters.environment);

    // 2. Filter by User
    const filteredByUser = activeFilters.user !== 'ALL_USERS'
        ? filteredByEnv.filter(log => log.user === activeFilters.user)
        : filteredByEnv;

    // 3. Slice for the selected timeframe
    const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
    const selectedTimeframeLogs = filteredByUser.filter(log => isWithinInterval(parseISO((log.created_at || log.createdAt)!), { start: startDate, end: endDate }));
    
    // 4. Transform for UI components
    return {
        apiHitsData: transformC4TSLogsToTimeSeries(selectedTimeframeLogs),
        topUsersChartData: transformC4TSLogsToTopUsers(selectedTimeframeLogs, 6),
        topEndpointsData: transformC4TSLogsToTopEndpoints(selectedTimeframeLogs, 50),
    };
  }, [rawLogs, activeFilters]);

  // ... (visibleEndpoints and apiHitsUrlColumns definitions remain the same)
  
  // --- RENDER LOGIC (remains the same) ---
  if (isLoading) { /* ... */ }
  if (error) { /* ... */ }
  if (!pageData) { /* ... */ }

  return (
    <div className="space-y-6">
      {/* ... The final JSX for rendering the page ... */}
    </div>
  );
};