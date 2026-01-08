import React from "react";
import { render, screen } from "@testing-library/react";
import StructurizrAnalytics from "../pages/StructurizrAnalytics";
import { mockUseOutletContext, mockUseQuery } from "./test-utils";
import { vi } from "vitest";

const baseFilters: any = {
  timeframe: "7d",
  environment: "ALL",
  user: "ALL_USERS",
  department: "ALL_DEPARTMENTS",
};

describe("StructurizrAnalytics page", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseOutletContext.mockReset();
  });

  test("shows Initializing when outlet context is missing", () => {
    mockUseOutletContext.mockReturnValue(null);
    render(<StructurizrAnalytics />);
    expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
  });

  test("shows loading state", () => {
    mockUseOutletContext.mockReturnValue({ activeFilters: baseFilters });

    mockUseQuery
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        error: null,
      });

    render(<StructurizrAnalytics />);
    expect(screen.getByText(/Loading Structurizr Data/i)).toBeInTheDocument();
  });

  test("renders sections on success", () => {
    mockUseOutletContext.mockReturnValue({ activeFilters: baseFilters });

    mockUseQuery
      // rawLogs
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        error: null,
      })
      // topUsersTrend
      .mockReturnValueOnce({
        data: { value: 0, direction: "neutral" },
        isLoading: false,
        error: null,
      });

    render(<StructurizrAnalytics />);

    expect(screen.getByText(/Structurizr Workspaces/i)).toBeInTheDocument();
    expect(screen.getByTestId("WorkspaceMultiLineChart")).toBeInTheDocument();
    expect(screen.getByTestId("DonutChartComponent")).toBeInTheDocument();
    expect(screen.getByTestId("HorizontalBarChart")).toBeInTheDocument();
  });
});