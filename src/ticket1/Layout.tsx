// src/components/layout/Layout.tsx

const Layout: React.FC = () => {
  const location = useLocation();
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    timeframe: DEFAULT_TIMEFRAME_ID,
    user: DEFAULT_USER_ID,
    region: DEFAULT_REGION_ID,
    environment: DEFAULT_ENVIRONMENT_ID,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // --- THIS IS WHERE THE USER LIST IS NOW FETCHED ---
  const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({
    queryKey: ['distinctUsersForDropdown'],
    queryFn: async () => {
      // Fetch a wide date range to get a comprehensive list of all possible users
      const { startDate, endDate } = getTimeframeDates('year');
      
      // Fetch users from BOTH C4TS and Structurizr across ALL environments
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(startDate, endDate),
        fetchRawStructurizrLogsByDate(startDate, endDate) // Still uses single source for Structurizr
      ]);
      
      const c4tsUsers = extractC4TSDistinctUsers(c4tsLogs);
      const structurizrUsers = extractStructurizrDistinctUsers(structurizrLogs);
      
      // Combine users from both sources and get a unique, sorted list
      const allUsers = new Set([...c4tsUsers, ...structurizrUsers]);
      
      return Array.from(allUsers).sort();
    },
    staleTime: 1000 * 60 * 60, // Cache this user list for a full hour
    refetchOnWindowFocus: false,
  });

  const userFilterOptions: FilterOption[] = useMemo(() => {
    if (!distinctUsers) return [ALL_USERS_OPTION];
    const userOptions = distinctUsers.map(user => ({ id: user, label: user }));
    return [ALL_USERS_OPTION, ...userOptions];
  }, [distinctUsers]);

  const handleEnvironmentChange = (id: EnvironmentId) => setActiveFilters(prev => ({ ...prev, environment: id }));
  // ... other handlers

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <PageHeader
            // ...props...
            onEnvironmentChange={handleEnvironmentChange}
            userFilterOptions={userFilterOptions}
            isLoadingUsers={isLoadingUsers}
          />
          <div className="mt-6">
            <Outlet context={{ activeFilters, setLastUpdated }} />
          </div>
        </main>
        <Footer lastUpdated={lastUpdated} refreshIntervalMinutes={4} />
      </div>
    </div>
  );
};