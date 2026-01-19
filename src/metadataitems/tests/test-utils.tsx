// src/tests/test-utils.tsx
import React from "react";
import { vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// ✅ Add this (Recharts / ResponsiveContainer needs it in jsdom)
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserver);

export const mockUseQuery = vi.fn();



// ---- react-query mock ----
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

// ---- router mock ----
export const mockUseOutletContext = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useOutletContext: () => mockUseOutletContext(),
    Link: ({ to, children, ...rest }: any) => (
      <a href={typeof to === "string" ? to : "#"} {...rest}>
        {children}
      </a>
    ),
  };
});

// ---- dumb UI mocks to avoid chart libs / complex markup ----
vi.mock("../components/common/StatsCard", () => ({
  default: ({ items }: any) => (
    <div data-testid="StatsCard">{JSON.stringify(items)}</div>
  ),
}));

vi.mock("../components/common/TableComponent", () => ({
  default: ({ data, noDataMessage }: any) => (
    <div data-testid="TableComponent">
      {data?.length ? `rows:${data.length}` : noDataMessage}
    </div>
  ),
}));

vi.mock("../components/charts/SingleLineMetricChart", () => ({
  default: ({ lineName }: any) => (
    <div data-testid="SingleLineMetricChart">{lineName}</div>
  ),
}));

vi.mock("../components/charts/HorizontalBarChart", () => ({
  default: () => <div data-testid="HorizontalBarChart" />,
}));

vi.mock("../components/charts/WorkspaceMultiLineChart", () => ({
  default: () => <div data-testid="WorkspaceMultiLineChart" />,
}));

vi.mock("../components/charts/DonutChartComponent", () => ({
  default: () => <div data-testid="DonutChartComponent" />,
}));