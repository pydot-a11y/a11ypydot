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

  const { data: rawC4TSLogs, isLoading: isLoadingC4TS, error: errorC4TS } = useQuery<RawApiLog[], Error>({
    queryKey: ['overviewRawC4TSLogs'],
    queryFn: () => {
      const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
      return fetchRawC4TSLogsByDate(previousPeriod.start, currentPeriod.end);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: rawStructurizrLogs, isLoading: isLoadingStructurizr, error: errorStructurizr } = useQuery<RawStructurizrLog[], Error>({
    queryKey: ['overviewRawStructurizrLogs'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = subYears(endDate, 3);
      return fetchRawStructurizrLogsByDate(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // This single useMemo hook derives all data needed by the page's components.
  const pageData = useMemo(() => {
    if (!rawC4TSLogs || !rawStructurizrLogs || !outletContext) {
      return null;
    }

    const { activeFilters } = outletContext;
    const { startDate: selectedStartDate, endDate: selectedEndDate } = getTimeframeDates(activeFilters.timeframe);
    const { currentPeriod, previousPeriod } = getTrendCalculationPeriods();
    
    // --- START OF THE FIX ---
    // We apply filters directly to the correctly typed arrays, avoiding unsafe assertions.

    // 1. Apply user filter to the master datasets.
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawC4TSLogs.filter(log => log.user === activeFilters.user) : rawC4TSLogs;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? rawStructurizrLogs.filter(log => log.eonid === activeFilters.user) : rawStructurizrLogs;

    // 2. Slice the C4TS data by date.
    const c4tsCurrent = c4tsFilteredByUser.filter(log => {
      if (!log.createdAt) return false;
      try { return isWithinInterval(parseISO(log.createdAt), { start: selectedStartDate, end: selectedEndDate }); } 
      catch { return false; }
    });
    const c4tsPrevious = c4tsFilteredByUser.filter(log => {
      if (!log.createdAt) return false;
      try { return isWithinInterval(parseISO(log.createdAt), previousPeriod); } 
      catch { return false; }
    });

    // 3. Slice the Structurizr data by date.
    const structurizrCurrent = structurizrFilteredByUser.filter(log => {
      const dateString = (log as any).created_at || log.createdAt?.$date;
      if (!dateString) return false;
      try { return isWithinInterval(parseISO(dateString), { start: selectedStartDate, end: selectedEndDate }); } 
      catch { return false; }
    });
    const structurizrPrevious = structurizrFilteredByUser.filter(log => {
      const dateString = (log as any).created_at || log.createdAt?.$date;
      if (!dateString) return false;
      try { return isWithinInterval(parseISO(dateString), previousPeriod); } 
      catch { return false; }
    });

    // --- END OF THE FIX ---
    
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
  }, [rawC4TSLogs, rawStructurizrLogs, outletContext]);

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