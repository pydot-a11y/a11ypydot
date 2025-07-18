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
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. DATA FETCHING ---
  // We need to fetch data for the selected period AND the preceding period for trends.
  const { data: allData, isLoading, error } = useQuery({
    queryKey: ['overviewPageDataWithTrends', activeFilters],
    queryFn: async () => {
      // Get the date range for the user's selection
      const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
      
      // Get the preceding period for comparison
      const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
      
      // The broadest range we need to fetch is from the start of the previous period to the end of the current one.
      const fetchStartDate = previousPeriod.start;
      const fetchEndDate = currentEnd;
      
      // Fetch all the data we need in just two parallel calls
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchRawC4TSLogsByDate(fetchStartDate, fetchEndDate),
        fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
      ]);
      
      return { c4tsLogs, structurizrLogs, currentPeriod: { start: currentStart, end: currentEnd }, previousPeriod };
    },
  });

  // --- 2. DERIVED DATA USING useMemo ---
  const pageData = useMemo(() => {
    if (!allData) return null;

    const { c4tsLogs, structurizrLogs, currentPeriod, previousPeriod } = allData;
    
    const filterByUser = (logs: RawApiLog[] | RawStructurizrLog[], user: string) => {
        if (user === 'ALL_USERS') return logs;
        return logs.filter(log => (log as RawApiLog).user === user || (log as RawStructurizrLog).eonid === user);
    };

    const c4tsFiltered = filterByUser(c4tsLogs, activeFilters.user) as RawApiLog[];
    const structurizrFiltered = filterByUser(structurizrLogs, activeFilters.user) as RawStructurizrLog[];

    const filterByDateRange = (logs: any[], range: { start: Date, end: Date }) => { /* ... same as before ... */ };

    const c4tsCurrent = filterByDateRange(c4tsFiltered, currentPeriod);
    const c4tsPrevious = filterByDateRange(c4tsFiltered, previousPeriod);
    const structurizrCurrent = filterByDateRange(structurizrFiltered, currentPeriod);
    const structurizrPrevious = filterByDateRange(structurizrFiltered, previousPeriod);

    // --- LOGIC FIX FOR "All time" ---
    // If the timeframe is 'all-time', trends are meaningless, so we force them to be neutral.
    const isAllTime = activeFilters.timeframe === 'all-time';

    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsCurrent.length, trend: isAllTime ? { value: 0, direction: 'neutral' } : calculateTrend(c4tsCurrent.length, c4tsPrevious.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrCurrent), trend: isAllTime ? { value: 0, direction: 'neutral' } : calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrent), getStructurizrActiveWorkspaceCount(structurizrPrevious)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsCurrent).size, trend: isAllTime ? { value: 0, direction: 'neutral' } : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrCurrent).size, trend: isAllTime ? { value: 0, direction: 'neutral' } : calculateTrend(extractStructurizrDistinctUsers(structurizrCurrent).size, extractStructurizrDistinctUsers(structurizrPrevious).size) },
    };

    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsCurrent),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrCurrent),
        topUsersData: transformToTopUsersAcrossSystems(c4tsCurrent, structurizrCurrent),
    };
  }, [allData, activeFilters]);

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