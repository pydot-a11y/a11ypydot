// src/pages/Overview.tsx

// --- IMPORTS (Assume these are at the top) ---

// --- Helper Functions and Component Definition ---
const formatNumber = (num: number | undefined): string => (num || 0).toLocaleString();
const calculateTrend = (current: number, previous: number): Trend => { /* ... */ };
interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
}

const Overview: React.FC = () => {
  const outletContext = useOutletContext<PageContextType | null>();
  if (!outletContext) { /* ... guard clause ... */ }
  const { activeFilters, setLastUpdated } = outletContext;

  // --- MASTER DATA QUERY ---
  const { data: allData, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['overviewPageAllEnvsData'],
    queryFn: async () => {
      const { currentPeriod, previousPeriod } = getPeriodsForTrend('quarter');
      const fetchStartDate = previousPeriod.start;
      const fetchEndDate = currentPeriod.end;
      
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(fetchStartDate, fetchEndDate),
        fetchRawStructurizrLogsByDate(fetchStartDate, fetchEndDate),
      ]);
      
      return { c4tsLogs, structurizrLogs };
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, setLastUpdated]);
  
  // --- DERIVED DATA using useMemo (Updated with environment filter) ---
  const pageData = useMemo(() => {
    if (!allData) return null;

    const { c4tsLogs, structurizrLogs } = allData;
    
    // 1. Filter the entire raw dataset by the selected ENVIRONMENT.
    const c4tsFilteredByEnv = activeFilters.environment === 'ALL'
      ? c4tsLogs
      : c4tsLogs.filter(log => log.environment === activeFilters.environment);
      
    const structurizrFilteredByEnv = activeFilters.environment === 'ALL'
      ? structurizrLogs
      : structurizrLogs.filter(log => log.environment === activeFilters.environment);

    // 2. Now, all subsequent filtering (by user, by date) uses these pre-filtered arrays.
    const c4tsFilteredByUser = activeFilters.user !== 'ALL_USERS' ? c4tsFilteredByEnv.filter(log => log.user === activeFilters.user) : c4tsFilteredByEnv;
    const structurizrFilteredByUser = activeFilters.user !== 'ALL_USERS' ? structurizrFilteredByEnv.filter(log => log.eonid === activeFilters.user) : structurizrFilteredByEnv;

    // ... (The rest of the useMemo block for calculating stats and chart data remains the same,
    // as it flows from these correctly filtered variables).
    
    return { /* ... final stats and chart data objects ... */ };
  }, [allData, activeFilters]);

  // ... (topUsersColumns definition and Render Logic remain the same)
  
  return (
    <div className="space-y-6">
      {/* ... The final JSX for rendering the page ... */}
    </div>
  );
};