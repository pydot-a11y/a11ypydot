// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,
      staleTime: 30 * 1000,      // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000,     // Keep cached data for 5 minutes
    },
  },
});