// src/pages/Overview.tsx

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();

  // Guard Clause: Render a loading state until filters are available from the Layout
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters } = outletContext;

  // --- 1. MASTER DATA QUERY ---
  // This single, smart query fetches all data needed for the entire Overview page.
  const { data: allData, isLoading, error } = useQuery({
    // The query key includes all filters to ensure it refetches when any filter changes.
    queryKey: ['overviewPageDataWithTrends', activeFilters],
    queryFn: async () => {
      // a. Get the date range for the period selected in the UI (e.g., "Last 90 Days")
      const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
      
      // b. Calculate the immediately preceding period of the same length for trends.
      const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
      
      // c. Determine the widest possible date range we need to fetch.
      const fetchStartDate = previousPeriod.start;
      const fetchEndDate = currentEnd;
      
      // d. Fetch all the data we need from both sources in just two parallel calls.
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchRawC4TSLogsByDate(fetchStartDate, fetchEndDate),
        fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
      ]);
      
      // e. Return all the raw data and the calculated periods for the next step.
      return { c4tsLogs, structurizrLogs, currentPeriod: { start: currentStart, end: currentEnd }, previousPeriod };
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
  });

  // --- 2. DERIVED DATA USING useMemo ---
  // This hook acts as the "brain" of the component. It takes the raw data from the query
  // and transforms it into all the specific pieces the UI needs to render.
  const pageData = useMemo(() => {
    // Wait until the master query has successfully fetched data.
    if (!allData) return null;

    const { c4tsLogs, structurizrLogs, currentPeriod, previousPeriod } = allData;
    
    // First, apply the user filter to the master datasets.
    const filterByUser = (logs: (RawApiLog | RawStructurizrLog)[], user: string) => {
        if (user === 'ALL_USERS') return logs;
        return logs.filter(log => (log as RawApiLog).user === user || (log as RawStructurizrLog).eonid === user);
    };

    const c4tsFiltered = filterByUser(c4tsLogs, activeFilters.user) as RawApiLog[];
    const structurizrFiltered = filterByUser(structurizrLogs, activeFilters.user) as RawStructurizrLog[];

    // Create a robust helper for filtering by date range.
    const filterByDateRange = (logs: (RawApiLog | RawStructurizrLog)[], range: { start: Date; end: Date }) => {
      return logs.filter(log => {
        const dateString = (log as any).created_at || (log as any).createdAt;
        if (!dateString) return false;
        try {
          const date = parseISO(dateString);
          return isWithinInterval(date, range);
        } catch { return false; }
      });
    };
    
    // Slice the user-filtered data into "current" and "previous" buckets for trend calculation.
    const c4tsCurrent = filterByDateRange(c4tsFiltered, currentPeriod) as RawApiLog[];
    const c4tsPrevious = filterByDateRange(c4tsFiltered, previousPeriod) as RawApiLog[];
    
    const structurizrCurrent = filterByDateRange(structurizrFiltered, currentPeriod) as RawStructurizrLog[];
    const structurizrPrevious = filterByDateRange(structurizrFiltered, previousPeriod) as RawStructurizrLog[];

    // Handle the "All time" edge case for trends.
    const isAllTime = activeFilters.timeframe === 'all-time';
    const neutralTrend: Trend = { value: 0, direction: 'neutral' };

    // Calculate all stats for the cards, applying the "All time" rule.
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsCurrent.length, trend: isAllTime ? neutralTrend : calculateTrend(c4tsCurrent.length, c4tsPrevious.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrCurrent), trend: isAllTime ? neutralTrend : calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrent), getStructurizrActiveWorkspaceCount(structurizrPrevious)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractStructurizrDistinctUsers(structurizrCurrent).size, extractStructurizrDistinctUsers(structurizrPrevious).size) },
    };

    // Transform the "current" data slices for the UI components.
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

  // --- 3. RENDER LOGIC ---
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