// src/pages/Overview.tsx

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

const calculateTrend = (current: number, previous: number): Trend => {
  if (previous === 0) {
    return { value: current > 0 ? 100.0 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const percentageChange = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(percentageChange),
    direction: percentageChange > 0.1 ? 'up' : percentageChange < -0.1 ? 'down' : 'neutral',
  };
};

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  // --- All Hooks are called unconditionally at the top of the component ---

  // Master query for a 6-month range of C4TS data
  const { data: rawC4TSLogs, isLoading: isLoadingC4TS, error: errorC4TS } = useQuery<RawApiLog[], Error>({
    queryKey: ['overviewRawC4TSLogs'],
    queryFn: () => {
      const { endDate } = getTrendCalculationPeriods().currentPeriod;
      const { startDate } = getTrendCalculationPeriods().previousPeriod;
      return fetchRawC4TSLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Master query for a 3-year range of Structurizr data
  const { data: rawStructurizrLogs, isLoading: isLoadingStructurizr, error: errorStructurizr } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['overviewRawStructurizrLogs'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = subYears(endDate, 3);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // This single useMemo hook derives all data needed by the page's components
  const pageData = useMemo(() => {
    // Return null if the raw data isn't ready yet
    if (!rawC4TSLogs || !rawStructurizrLogs || !outletContext) {
      return null;
    }

    const { activeFilters } = outletContext;

    // A. Get all necessary date ranges
    const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(activeFilters.timeframe);
    const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
    
    // B. Apply the user filter to the master datasets
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawC4TSLogs.filter(log => log.user === activeFilters.user) : rawC4TSLogs;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawStructurizrLogs.filter(log => log.eonid === activeFilters.user) : rawStructurizrLogs;

    // C. Create a robust, reusable helper function for date filtering
    const filterByDateRange = (logs: (RawApiLog | RawStructurizrLog)[], range: { start: Date; end: Date }) => {
      return logs.filter(log => {
        // Safely handle both `createdAt` formats
        const dateString = log.createdAt && typeof log.createdAt === 'object' ? (log.createdAt as any).$date : log.createdAt;
        if (!dateString) return false;
        
        try {
          const date = parseISO(dateString);
          // Safety check for invalid dates before comparison
          if (isNaN(date.getTime())) return false;
          return isWithinInterval(date, range);
        } catch {
          // Catch any unexpected parsing errors
          return false;
        }
      });
    };
    
    // D. Apply the date filtering to create our data slices
    const c4tsSelected = filterByDateRange(c4tsFilteredByUser, { start: selectedStartDate, end: selectedEndDate }) as RawApiLog[];
    const structurizrSelected = filterByDateRange(structurizrFilteredByUser, { start: selectedStartDate, end: selectedEndDate }) as RawStructurizrLog[];

    const c4tsCurrentTrend = filterByDateRange(c4tsFilteredByUser, currentPeriod) as RawApiLog[];
    const c4tsPreviousTrend = filterByDateRange(c4tsFilteredByUser, previousPeriod) as RawApiLog[];
    const structurizrCurrentTrend = filterByDateRange(structurizrFilteredByUser, currentPeriod) as RawStructurizrLog[];
    const structurizrPreviousTrend = filterByDateRange(structurizrFilteredByUser, previousPeriod) as RawStructurizrLog[];

    // E. Calculate the final stats for the cards
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsSelected.length, trend: calculateTrend(c4tsCurrentTrend.length, c4tsPreviousTrend.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrSelected), trend: calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrentTrend), getStructurizrActiveWorkspaceCount(structurizrPreviousTrend)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsSelected).size, trend: calculateTrend(extractC4TSDistinctUsers(c4tsCurrentTrend).size, extractC4TSDistinctUsers(c4tsPreviousTrend).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrSelected).size, trend: calculateTrend(extractStructurizrDistinctUsers(structurizrCurrentTrend).size, extractStructurizrDistinctUsers(structurizrPreviousTrend).size) },
    };

    // F. Transform the sliced data for the UI components and return the final payload
    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsSelected),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrSelected),
        topUsersData: transformToTopUsersAcrossSystems(c4tsSelected, structurizrSelected),
    };
  }, [rawC4TSLogs, rawStructurizrLogs, outletContext]);

  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  // --- Render Logic ---
  const isLoading = isLoadingC4TS || isLoadingStructurizr;
  const error = errorC4TS || errorStructurizr;

  if (!outletContext) {
    // This handles the initial render before the Layout context is available
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  return (
    <div className="space-y-6">
      <StatsCard items={[
            { title: 'Total API Hits (C4TS)', value: formatNumber(pageData.stats.totalApiHits.value), trend: pageData.stats.totalApiHits.trend },
            { title: 'Active Workspaces (Structurizr)', value: formatNumber(pageData.stats.activeWorkspaces.value), trend: pageData.stats.activeWorkspaces.trend },
            { title: 'Total Users (C4TS)', value: formatNumber(pageData.stats.totalC4TSUsers.value), trend: pageData.stats.totalC4TSUsers.trend },
            { title: 'Total Users (Structurizr)', value: formatNumber(pageData.stats.totalStructurizrUsers.value), trend: pageData.stats.totalStructurizrUsers.trend },
        ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2><Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={pageData.c4tsChartData} lineName="API Hits" lineColor="#3b82f6" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2><Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details →</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={pageData.structurizrChartData} lineName="Workspaces Created" lineColor="#10b981" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">Top Users Across All Systems</h2></div>
        <TableComponent
            columns={topUsersColumns}
            data={pageData.topUsersData}
            getRowKey="id"
            noDataMessage="No user data available."
        />
      </div>
    </div>
  );
};

export default Overview;