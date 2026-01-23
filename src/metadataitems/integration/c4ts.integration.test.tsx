// src/tests/integration/C4TSAnalytics.integration.test.tsx
import './mocks';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import AppRoutes from '../../AppRoutes';
import { renderWithProviders } from './renderWithProviders';

describe('C4TS Analytics page (integration)', () => {
  it('renders C4TS heading and chart placeholders', async () => {
    renderWithProviders(<AppRoutes />, { route: '/c4ts' });

    expect(await screen.findByRole('heading', { name: /C4TS Analytics/i })).toBeInTheDocument();

    // charts are mocked in mocks.tsx so this stays stable
    expect(screen.getAllByTestId(/DonutChartComponent|HorizontalBarChart|SingleLineMetricChart|WorkspaceMultiLineChart/i).length)
      .toBeGreaterThan(0);
  });
});