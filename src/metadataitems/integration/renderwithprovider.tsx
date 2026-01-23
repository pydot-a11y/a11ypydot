// src/tests/integration/renderWithProviders.tsx
import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity, // treat test data as always fresh
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    },
    logger: {
      // keeps vitest output clean
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return client;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    seedQueries,
  }: {
    route?: string;
    seedQueries?: (client: QueryClient) => void;
  } = {}
) {
  const client = createTestQueryClient();
  seedQueries?.(client);

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { client, ...render(ui, { wrapper: Wrapper }) };
}