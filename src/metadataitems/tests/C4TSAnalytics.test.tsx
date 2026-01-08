import React from "react";
import { render, screen } from "@testing-library/react";
import C4TSAnalytics from "../pages/C4TSAnalytics";
import { mockUseOutletContext, mockUseQuery } from "./test-utils";
import { vi } from "vitest";

const baseFilters: any = {
  timeframe: "7d",
  environment: "ALL",
  user: "ALL_USERS",
  department: "ALL_DEPARTMENTS",
};

describe("C4TSAnalytics page", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseOutletContext.mockReset();
  });

  test("shows Initializing when outlet context is missing", () => {
    mockUseOutletContext.mockReturnValue(null);
    render(<C4TSAnalytics />);
    expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
  });

  test("shows loading state", () => {
    mockUseOutletContext.mockReturnValue({
      activeFilters: baseFilters,
      setLastUpdated: vi.fn(),
    });

    // first useQuery => rawLogs
    mockUseQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      dataUpdatedAt: 0,
    });

    // second useQuery => topUsersTrend
    mockUseQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      dataUpdatedAt: 0,
    });

    render(<C4TSAnalytics />);
    expect(screen.getByText(/Loading C4TS Data/i)).toBeInTheDocument();
  });

  test("renders charts + table on success", () => {
    mockUseOutletContext.mockReturnValue({
      activeFilters: baseFilters,
      setLastUpdated: vi.fn(),
    });

    mockUseQuery
      // rawLogs
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
      })
      // topUsersTrend
      .mockReturnValueOnce({
        data: { value: 0, direction: "neutral" },
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
      });

    render(<C4TSAnalytics />);

    expect(screen.getByText(/API Hits/i)).toBeInTheDocument();
    expect(screen.getByTestId("SingleLineMetricChart")).toBeInTheDocument();
    expect(screen.getByTestId("HorizontalBarChart")).toBeInTheDocument();
    expect(screen.getByTestId("TableComponent")).toBeInTheDocument();
  });
});