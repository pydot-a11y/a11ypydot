// src/pages/StructurizrAnalytics.tsx

// --- IMPORTS (Ensure these are at the top) ---
// import { fetchAllStructurizrLogs } from '../services/apiService';

// --- Component Definition ---
const StructurizrAnalytics: React.FC = () => {
    const outletContext = useOutletContext<PageContextType | null>();
    if (!outletContext) { /* ... guard clause ... */ }
    const { activeFilters, setLastUpdated } = outletContext;
  
    // --- 1. MASTER DATA QUERY ---
    const { data: rawLogs, isLoading, error, dataUpdatedAt } = useQuery<RawStructurizrLog[], Error>({
      queryKey: ['structurizrPageAllEnvsData'],
      queryFn: () => {
        // Fetch a wide range of data for this page
        const { startDate, endDate } = getTimeframeDates('year'); // Fetch last year of data
        return fetchAllStructurizrLogs(startDate, endDate);
      },
      staleTime: 1000 * 60 * 5,
    });
    
    // --- 2. DYNAMIC FOOTER UPDATE ---
    useEffect(() => {
      if (dataUpdatedAt > 0) {
        setLastUpdated(new Date(dataUpdatedAt));
      }
    }, [dataUpdatedAt, setLastUpdated]);
    
    // --- 3. DEDICATED TREND QUERY (for Top Users card) ---
    const { data: topUsersTrend } = useQuery<Trend, Error>({
      queryKey: ['structurizrTopUsersTrend', activeFilters],
      queryFn: async () => { /* ... same trend logic as C4TS page, but using Structurizr fetchers ... */ },
    });
  
    // --- 4. DERIVED DATA using useMemo ---
    const pageData = useMemo(() => {
      if (!rawLogs) return null;
  
      // A. Filter by Environment
      const filteredByEnv = activeFilters.environment === 'ALL'
          ? rawLogs
          : rawLogs.filter(log => log.environment === activeFilters.environment);
  
      // B. Filter by User
      const filteredByUser = activeFilters.user !== 'ALL_USERS'
          ? filteredByEnv.filter(log => log.eonid === activeFilters.user)
          : filteredByEnv;
  
      // C. Slice for the selected timeframe
      const { startDate, endDate } = getTimeframeDates(activeFilters.timeframe);
      const selectedTimeframeLogs = filteredByUser.filter(log => isWithinInterval(parseISO((log as any).created_at!), { start: startDate, end: endDate }));
      
      // D. Transform for UI components
      return {
          workspacesTrendData: transformStructurizrToMultiLineTrend(selectedTimeframeLogs),
          topUsersChartData: transformStructurizrToTopUsers(selectedTimeframeLogs, 6),
          accessMethodsData: transformStructurizrToAccessMethods(selectedTimeframeLogs),
      };
    }, [rawLogs, activeFilters]);
  
    // --- RENDER LOGIC ---
    if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Structurizr Data...</div>;
    if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
    if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;
  
    return (
      <div className="space-y-6">
        {/* Structurizr Workspaces Multi-Line Chart Card */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Structurizr Workspaces</h2>
            <span className="text-sm text-gray-500">Timeframe: {activeFilters.timeframe}</span>
          </div>
          <div className="px-6 pb-6">
            <WorkspaceTrendChart data={pageData.workspacesTrendData} aspect={3} />
          </div>
        </div>
  
        {/* How workspaces are being accessed & Top Users Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {/* ... Access Methods Donut and Table JSX, consuming pageData.accessMethodsData ... */}
          </div>
          <div className="lg:col-span-1 bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">TOP USERS</h2>
              {topUsersTrend && ( /* ... trend JSX ... */ )}
            </div>
            <div className="px-6 pb-6">
              <HorizontalBarChart data={pageData.topUsersChartData} barColor="#4ade80" aspect={1.5} xAxisLabel="Workspaces Created" />
            </div>
          </div>
        </div>
      </div>
    );
  };