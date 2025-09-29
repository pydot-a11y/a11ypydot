// src/components/layout/Layout.tsx

const Layout: React.FC = () => {
    const location = useLocation();
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
      timeframe: DEFAULT_TIMEFRAME_ID,
      user: DEFAULT_USER_ID,
      region: DEFAULT_REGION_ID,
    });
  
    // --- START OF CHANGES TO INSERT ---
  
    // 1. Add state to hold the timestamp of the last successful data fetch.
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // 2. A constant for the refresh interval.
    const REFRESH_INTERVAL_MINUTES = 4;
    
    // --- END OF CHANGES TO INSERT ---
  
  
    const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({
      // ... (rest of the useQuery hook is unchanged)
    });
  
    // ... (userFilterOptions useMemo and filter handlers are unchanged)
  
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <PageHeader
              // ... (props for PageHeader are unchanged)
            />
            <div className="mt-6">
              {/* --- START OF CHANGE TO INSERT --- */}
              {/* 3. Pass both filters AND the new update function down via context */}
              <Outlet context={{ activeFilters, setLastUpdated }} />
              {/* --- END OF CHANGE TO INSERT --- */}
            </div>
          </main>
          {/* --- START OF CHANGE TO INSERT --- */}
          {/* 4. Pass the state down to the Footer as props */}
          <Footer lastUpdated={lastUpdated} refreshIntervalMinutes={REFRESH_INTERVAL_MINUTES} />
          {/* --- END OF CHANGE TO INSERT --- */}
        </div>
      </div>
    );
  };