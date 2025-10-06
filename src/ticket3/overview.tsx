// src/pages/Overview.tsx

// --- Helper Functions ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();

// --- Component Definition ---
interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  if (!outletContext) {
    return <div className="p-6 text-center text-gray-500 animate-pulse">Initializing...</div>;
  }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- MASTER DATA QUERY (This replaces your existing query) ---
  const { data: allData, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['overviewPageAllEnvsData'],
    queryFn: async () => {
      // Fetch a 6-month range of data to cover all trend calculations.
      const { currentPeriod, previousPeriod } = getPeriodsForTrend('quarter');
      const fetchStartDate = previousPeriod.start;
      const fetchEndDate = currentPeriod.end;
      
      // Fetch C4TS data from all environments and Structurizr from its single source.
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(fetchStartDate, fetchEndDate),
        fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
      ]);
      
      return { c4tsLogs, structurizrLogs };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);
  
  // --- DERIVED DATA using useMemo (This replaces your existing useMemo block) ---
  const pageData = useMemo(() => {
    if (!allData) return null;

    const { c4tsLogs, structurizrLogs } = allData;
    
    // 1. Filter by Environment first
    const c4tsFilteredByEnv = activeFilters.environment === 'ALL'
      ? c4tsLogs
      : c4tsLogs.filter(log => log.environment === activeFilters.environment);
      
    const structurizrFilteredByEnv = activeFilters.environment === 'ALL'
      ? structurizrLogs
      : structurizrLogs.filter(log => log.environment === activeFilters.environment);

    // 2. Then filter by User
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? c4tsFilteredByEnv.filter(log => log.user === activeFilters.user) : c4tsFilteredByEnv;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? structurizrFilteredByEnv.filter(log => log.eonid === activeFilters.user) : structurizrFilteredByEnv;

    // 3. Get date ranges for UI and trends
    const { startDate: currentStart, endDate: currentEnd } = getTimeframeDates(activeFilters.timeframe);
    const previousPeriod = getPrecedingPeriod({ start: currentStart, end: currentEnd });
    
    const filterByDateRange = (logs: any[], range: { start: Date, end: Date }) => {
        return logs.filter(log => {
            const dateString = (log as any).created_at || (log as any).createdAt;
            if (!dateString) return false;
            try {
                const date = parseISO(dateString);
                return isWithinInterval(date, range);
            } catch { return false; }
        });
    };
    
    // 4. Slice data into current and previous buckets
    const c4tsCurrent = filterByDateRange(c4tsFilteredByUser, { start: currentStart, end: currentEnd });
    const c4tsPrevious = filterByDateRange(c4tsFilteredByUser, previousPeriod);
    const structurizrCurrent = filterByDateRange(structurizrFilteredByUser, { start: currentStart, end: currentEnd });
    const structurizrPrevious = filterByDateRange(structurizrFilteredByUser, previousPeriod);

    const isAllTime = activeFilters.timeframe === 'all-time';
    const neutralTrend: Trend = { value: 0, direction: 'neutral' };

    // 5. Calculate stats
    const stats: OverviewSummaryStats = {
        totalApiHits: { value: c4tsCurrent.length, trend: isAllTime ? neutralTrend : calculateTrend(c4tsCurrent.length, c4tsPrevious.length) },
        activeWorkspaces: { value: getStructurizrActiveWorkspaceCount(structurizrCurrent), trend: isAllTime ? neutralTrend : calculateTrend(getStructurizrActiveWorkspaceCount(structurizrCurrent), getStructurizrActiveWorkspaceCount(structurizrPrevious)) },
        totalC4TSUsers: { value: extractC4TSDistinctUsers(c4tsCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractC4TSDistinctUsers(c4tsCurrent).size, extractC4TSDistinctUsers(c4tsPrevious).size) },
        totalStructurizrUsers: { value: extractStructurizrDistinctUsers(structurizrCurrent).size, trend: isAllTime ? neutralTrend : calculateTrend(extractStructurizrDistinctUsers(structurizrCurrent).size, extractStructurizrDistinctUsers(structurizrPrevious).size) },
    };

    // 6. Return the final data payload
    return {
        stats,
        c4tsChartData: transformC4TSLogsToTimeSeries(c4tsCurrent),
        structurizrChartData: transformStructurizrToCreationTrend(structurizrCurrent),
        topUsersData: transformToTopUsersAcrossSystems(c4tsCurrent, structurizrCurrent),
    };
  }, [allData, activeFilters]);

  // This column definition can stay as it is
  const topUsersColumns: ColumnDef<UserData>[] = useMemo(() => [
    { header: 'User', accessorKey: 'name', tdClassName: 'font-medium text-gray-900' },
    { header: 'Department', accessorKey: 'department' },
    { header: 'C4TS API Hits', accessorKey: 'c4tsApiHits', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
    { header: 'Structurizr Workspaces', accessorKey: 'structurizrWorkspaces', cellRenderer: (value) => formatNumber(value as number), tdClassName: 'text-right', thClassName: 'text-right' },
  ], []);

  // --- RENDER LOGIC ---
  const isLoading = isLoadingC4TS || isLoadingStructurizr;
  const error = errorC4TS || errorStructurizr;
  
  if (isLoading) return <div className="p-6 text-center text-gray-500 animate-pulse">Loading Overview Data...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error.message}</div>;
  if (!pageData) return <div className="p-6 text-center text-gray-500 animate-pulse">Processing data...</div>;

  // This is your exact JSX, now correctly referencing the `pageData` object
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
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">C4TS Analytics</h2><Link to="/c4ts" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details &rarr;</Link></div>
            <div className="px-6 pb-6">
                <SingleLineMetricChart data={pageData.c4tsChartData} lineName="API Hits" lineColor="#3b82f6" yAxisLabel="Count" aspect={2.5} />
            </div>
        </div>
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 flex justify-between items-center"><h2 className="text-lg font-medium text-gray-900">Structurizr Analytics</h2><Link to="/structurizr" className="text-sm font-medium text-primary-600 hover:text-primary-500">View Details &rarr;</Link></div>
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
            noDataMessage="No user data to display."
        />
      </div>
    </div>
  );
};

export default Overview;