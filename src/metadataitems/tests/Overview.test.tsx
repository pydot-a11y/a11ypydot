import React from "react";
import { render, screen } from "@testing-library/react";
import Overview from "../pages/Overview";
import { mockUseOutletContext, mockUseQuery } from "./test-utils";

const baseFilters: any = {
  timeframe: "7d",
  environment: "ALL",
  user: "ALL_USERS",
  department: "ALL_DEPARTMENTS",
};

describe("Overview page", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseOutletContext.mockReset();
  });

  test("shows Initializing when outlet context is missing", () => {
    mockUseOutletContext.mockReturnValue(null);

    render(<Overview />);
    expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
  });

  test("shows loading state", () => {
    mockUseOutletContext.mockReturnValue({
      activeFilters: baseFilters,
      setLastUpdated: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      dataUpdatedAt: 0,
    });

    render(<Overview />);
    expect(screen.getByText(/Loading Overview Data/i)).toBeInTheDocument();
  });

  test("shows error state", () => {
    mockUseOutletContext.mockReturnValue({
      activeFilters: baseFilters,
      setLastUpdated: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Boom" },
      dataUpdatedAt: 0,
    });

    render(<Overview />);
    expect(screen.getByText(/Error:\s*Boom/i)).toBeInTheDocument();
  });

  test("renders main sections on success", () => {
    mockUseOutletContext.mockReturnValue({
      activeFilters: baseFilters,
      setLastUpdated: vi.fn(),
    });

    mockUseQuery.mockReturnValue({
      data: {
        c4tsLogs: [],
        structurizrLogs: [],
        currentPeriod: { start: new Date(), end: new Date() },
        previousPeriod: { start: new Date(), end: new Date() },
      },
      isLoading: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(<Overview />);

    expect(screen.getByTestId("StatsCard")).toBeInTheDocument();
    expect(screen.getByText(/C4TS Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Structurizr Analytics/i)).toBeInTheDocument();
    expect(screen.getByTestId("TableComponent")).toBeInTheDocument();
  });
});