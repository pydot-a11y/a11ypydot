// src/components/layout/Layout.tsx

const Layout: React.FC = () => {
    const location = useLocation();
  
    // --- 1. UPDATE THE STATE OBJECT ---
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
      timeframe: DEFAULT_TIMEFRAME_ID,
      user: DEFAULT_USER_ID,
      region: DEFAULT_REGION_ID,
      environment: DEFAULT_ENVIRONMENT_ID, // Add the new environment state
    });
  
    // ... (useQuery for distinct users remains the same)
    const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({ /* ... */ });
    const userFilterOptions: FilterOption[] = useMemo(() => { /* ... */ }, [distinctUsers]);
  
    // --- 2. ADD THE NEW HANDLER ---
    const handleTimeframeChange = (id: TimeframeId) => setActiveFilters(prev => ({ ...prev, timeframe: id }));
    const handleUserChange = (id: UserId) => setActiveFilters(prev => ({ ...prev, user: id }));
    const handleRegionChange = (id: RegionId) => setActiveFilters(prev => ({ ...prev, region: id }));
    const handleEnvironmentChange = (id: EnvironmentId) => setActiveFilters(prev => ({ ...prev, environment: id }));
  
    const getPageTitle = (): string => { /* ... */ };
  
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            {/* --- 3. PASS THE NEW HANDLER DOWN --- */}
            <PageHeader
              title={getPageTitle()}
              activeFilters={activeFilters}
              onTimeframeChange={handleTimeframeChange}
              onUserChange={handleUserChange}
              onRegionChange={handleRegionChange}
              onEnvironmentChange={handleEnvironmentChange}
              userFilterOptions={userFilterOptions}
              isLoadingUsers={isLoadingUsers}
            />
            <div className="mt-6">
              <Outlet context={{ activeFilters, setLastUpdated }} />
            </div>
          </main>
          <Footer lastUpdated={lastUpdated} refreshIntervalMinutes={REFRESH_INTERVAL_MINUTES} />
        </div>
      </div>
    );
  };