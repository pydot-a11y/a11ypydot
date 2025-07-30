// src/pages/Overview.tsx
// Here is the exact change you need to make in each of those files.
// The Required Change
// Each page component is now receiving the setLastUpdated function from the Layout component via the Outlet context. We need to actually use that function.
// We will add a useEffect hook to each page. This hook will watch for changes in the dataUpdatedAt timestamp that React Query provides for each successful query. When that timestamp changes, the hook will call setLastUpdated, passing the new date up to the Layout component, which then passes it down to the Footer.








// --- Component Definition ---
interface PageContextType {
    activeFilters: ActiveFilters;
    setLastUpdated: (date: Date) => void; // Expect the update function
  }
  
  const Overview: React.FC = () => {
    const outletContext = useOutletContext<PageContextType | null>();
    if (!outletContext) { /* ... guard clause ... */ }
    const { activeFilters, setLastUpdated } = outletContext; // Destructure the function
  
    // --- Master Data Query ---
    // Get the `dataUpdatedAt` property from the useQuery result
    const { data: allData, isLoading, error, dataUpdatedAt } = useQuery({
      queryKey: ['overviewPageDataWithTrends', activeFilters],
      queryFn: async () => { /* ... */ },
    });
  
    // --- START OF REQUIRED CHANGE ---
    // Add this useEffect hook to report when data is updated.
    useEffect(() => {
      // `dataUpdatedAt` is a timestamp (number) from React Query.
      // If it's greater than 0, it means a successful fetch has completed.
      if (dataUpdatedAt > 0) {
        setLastUpdated(new Date(dataUpdatedAt));
      }
    }, [dataUpdatedAt, setLastUpdated]); // This effect runs whenever dataUpdatedAt changes
    // --- END OF REQUIRED CHANGE ---
    
    // ... (The rest of the component remains exactly the same) ...
  };
  
  export default Overview;


  // src/pages/C4TSAnalytics.tsx

interface PageContextType {
    activeFilters: ActiveFilters;
    setLastUpdated: (date: Date) => void;
  }
  
  const C4TSAnalytics: React.FC = () => {
    const outletContext = useOutletContext<PageContextType | null>();
    // ...
    const { activeFilters, setLastUpdated } = outletContext;
  
    const { data: rawLogs, isLoading, error, dataUpdatedAt } = useQuery<RawApiLog[], Error>({
      queryKey: ['c4tsRawLogs', activeFilters.timeframe],
      // ...
    });
    
    // Add this useEffect
    useEffect(() => {
      if (dataUpdatedAt > 0) {
        setLastUpdated(new Date(dataUpdatedAt));
      }
    }, [dataUpdatedAt, setLastUpdated]);
  
    // ... rest of the component
  };

//   Files to Change: C4TSAnalytics.tsx and StructurizrAnalytics.tsx
// You need to apply the exact same pattern to the other two pages.
// Update the PageContextType interface at the top of each file to include setLastUpdated: (date: Date) => void;.
// Destructure setLastUpdated from outletContext.
// Destructure dataUpdatedAt from their respective master useQuery hooks.
// Add the useEffect block to call setLastUpdated when dataUpdatedAt changes.