// src/tests/integration/DeepLinkRouting.integration.test.tsx
import './mocks';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import AppRoutes from '../../AppRoutes';
import { renderWithProviders } from './renderWithProviders';

describe('Deep link routing (integration)', () => {
  it('renders C4TS page when landing on /c4ts', async () => {
    renderWithProviders(<AppRoutes />, { route: '/c4ts' });
    expect(await screen.findByRole('heading', { name: /C4TS Analytics/i })).toBeInTheDocument();
  });

  it('renders Structurizr page when landing on /structurizr', async () => {
    renderWithProviders(<AppRoutes />, { route: '/structurizr' });
    expect(await screen.findByRole('heading', { name: /Structurizr Analytics/i })).toBeInTheDocument();
  });
});