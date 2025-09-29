// src/pages/Overview.tsx

// --- Component Definition ---
interface PageContextType {
    activeFilters: ActiveFilters;
    // --- START OF CHANGE TO INSERT ---
    // 1. Expect the update function to be in the context type
    setLastUpdated: (date: Date) => void;
    // --- END OF CHANGE TO INSERT ---
  }
  
  const Overview: React.FC = () => {
    const outletContext = useOutletContext<PageContextType | null>();
    if (!outletContext) { /* ... guard clause ... */ }
    // --- START OF CHANGE TO INSERT ---
    // 2. Destructure the new function from the context
    const { activeFilters, setLastUpdated } = outletContext;
    // --- END OF CHANGE TO INSERT ---
  
    // --- Master Data Query ---
    // --- START OF CHANGE TO INSERT ---
    // 3. Destructure `dataUpdatedAt` from your master useQuery hook
    const { data: allData, isLoading, error, dataUpdatedAt } = useQuery({
    // --- END OF CHANGE TO INSERT ---
      queryKey: ['overviewPageDataWithTrends', activeFilters],
      queryFn: async () => { /* ... */ },
    });
  
    // --- START OF CHANGE TO INSERT ---
    // 4. Add this entire useEffect hook right after your master useQuery
    useEffect(() => {
      // `dataUpdatedAt` is a timestamp from React Query.
      // It's non-zero only after a successful fetch.
      if (dataUpdatedAt > 0) {
        // Call the function from Layout to update the global timestamp
        setLastUpdated(new Date(dataUpdatedAt));
      }
    }, [dataUpdatedAt, setLastUpdated]);
    // --- END OF CHANGE TO INSERT ---
    
    // ... (The rest of your component's useMemo hooks and JSX remain exactly the same)
  };
  