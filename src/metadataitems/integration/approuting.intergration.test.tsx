// src/tests/integration/AppRouting.integration.test.tsx
import './mocks';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppRoutes from '../../AppRoutes';
import { renderWithProviders } from './renderWithProviders';

describe('App routing (integration)', () => {
  beforeEach(() => {
    // nothing needed, but keeping pattern consistent
  });

  it('renders Overview at "/" and navigates via sidebar links', async () => {
    renderWithProviders(<AppRoutes />, { route: '/' });

    // Landing page
    expect(await screen.findByRole('heading', { name: /Analytics Overview/i })).toBeInTheDocument();

    // Sidebar user name should appear from mocked apiService
    expect(await screen.findByText(/Test\s+User/i)).toBeInTheDocument();

    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: /C4TS Analytics/i }));
    expect(await screen.findByRole('heading', { name: /C4TS Analytics/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Structurizr Analytics/i }));
    expect(await screen.findByRole('heading', { name: /Structurizr Analytics/i })).toBeInTheDocument();
  });
});