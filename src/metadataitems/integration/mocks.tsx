// src/tests/integration/mocks.tsx
import '../test-utils';
import { vi } from 'vitest';

// --- DOM stubs often missing in jsdom ---
if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error - jsdom
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!('matchMedia' in globalThis)) {
  // @ts-expect-error - jsdom
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// @ts-expect-error - jsdom
globalThis.scrollTo = globalThis.scrollTo || (() => {});

// --- Chart components: mock to stable placeholders (charts are not what we're testing) ---
vi.mock('../../components/charts/DonutChartComponent', () => ({
  default: () => <div data-testid="DonutChartComponent" />,
}));

vi.mock('../../components/charts/HorizontalBarChart', () => ({
  default: () => <div data-testid="HorizontalBarChart" />,
}));

vi.mock('../../components/charts/SingleLineMetricChart', () => ({
  default: () => <div data-testid="SingleLineMetricChart" />,
}));

vi.mock('../../components/charts/WorkspaceMultiLineChart', () => ({
  default: () => <div data-testid="WorkspaceMultiLineChart" />,
}));

// --- API service: one place to mock network for ALL integration tests ---
vi.mock('../../services/apiService', async () => {
  const actual: any = await vi.importActual('../../services/apiService');

  return {
    ...actual,

    // Sidebar / Layout fetch
    getCurrentUserData: vi.fn().mockResolvedValue({ givenname: 'Test', lastname: 'User' }),
    fetchUsersMetadata: vi.fn().mockResolvedValue({ u1: { department: 'EA' } }),

    // C4TS page
    fetchAllC4TSLogs: vi.fn().mockResolvedValue([
      { createdAt: '2024-02-01T12:00:00.000Z', user: 'u1', endpoint: '/v1/test', environment: 'DEV', region: 'NA' },
    ]),

    // Structurizr page
    fetchRawStructurizrLogsByDate: vi.fn().mockResolvedValue([
      { created_at: '2024-02-01T12:00:00.000Z', eonid: 'u1', environment: 'DEV' },
    ]),
  };
});