// src/tests/Overview.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Overview from '../pages/Overview';

// 1) Mock outlet context (THIS is what was missing)
const mockUseOutletContext = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => mockUseOutletContext(),
  };
});

// 2) Mock react-query useQuery so we can force loading/error/success states
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (args: any) => mockUseQuery(args),
}));

// 3) Mock transformer/util functions so the "success" render is deterministic
vi.mock('../utils/dataTransformer', () => ({
  transformC4TSLogsToTimeSeries: () => [{ name: 'x', value: 1 }],
  transformStructurizrToCreationTrend: () => [{ name: 'y', value: 2 }],
  transformToTopUsersAcrossSystems: () => [{ id: '1', name: 'Dorothy', department: 'EA', c4tsApiHits: 3, structurizrWorkspaces: 4 }],
  getStructurizrActiveWorkspaceCount: () => 7,
  extractC4TSDistinctUsers: () => new Set(['u1', 'u2']),
  extractStructurizrDistinctUsers: () => new Set(['e1']),
}));

vi.mock('../utils/trendUtils', () => ({
  calculateTrend: () => ({ value: 0, direction: 'neutral' }),
}));

// (date utils are only used to compute ranges; safe to keep real unless you want determinism)
// vi.mock('../utils/dateUtils', () => ({ ... }))

const baseActiveFilters = {
  timeframe: 'this-month',
  environment: 'ALL',
  user: 'ALL_USERS',
  department: 'ALL_DEPARTMENTS',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseOutletContext.mockReturnValue({
    activeFilters: baseActiveFilters,
    setLastUpdated: vi.fn(),
  });
});

describe('Overview page', () => {
  it('shows Initializing when outlet context is missing', () => {
    mockUseOutletContext.mockReturnValue(null);

    // useQuery won't even matter, component returns early
    renderPage();
    expect(screen.getByText(/Initializing\.\.\./i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      dataUpdatedAt: 0,
    });

    renderPage();
    expect(screen.getByText(/Loading Overview Data\.\.\./i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Boom'),
      dataUpdatedAt: 0,
    });

    renderPage();
    expect(screen.getByText(/Error:\s*Boom/i)).toBeInTheDocument();
  });

  it('renders main sections on success', () => {
    mockUseQuery.mockReturnValue({
      data: {
        c4tsLogs: [{ environment: 'DEV', user: 'u1', created_at: new Date().toISOString() }],
        structurizrLogs: [{ environment: 'DEV', eonid: 'e1', createdAt: new Date().toISOString() }],
        currentPeriod: { start: new Date(), end: new Date() },
        previousPeriod: { start: new Date(), end: new Date() },
      },
      isLoading: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    renderPage();

    // Avoid data-testid dependency (your StatsCard currently doesn't expose it)
    expect(screen.getByText(/C4TS Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Structurizr Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Users Across All Systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Dorothy/i)).toBeInTheDocument();
  });
});