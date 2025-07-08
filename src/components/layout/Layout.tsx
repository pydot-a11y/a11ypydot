// src/components/layout/Layout.tsx

import React, { useState, useMemo } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // NEW: useQuery is now essential here

// UNCHANGED Components
import Sidebar from './Sidebar';
import Header from './Header';
import PageHeader from './PageHeader';
import Footer from './Footer';

// CHANGED: Imports now include UserId, FilterOption, and dynamic user logic
import { ActiveFilters, TimeframeId, UserId, RegionId, FilterOption } from '../../types/common';
import {
  DEFAULT_TIMEFRAME_ID,
  DEFAULT_USER_ID, // Changed from DEPARTMENT
  DEFAULT_REGION_ID,
  ALL_USERS_OPTION, // NEW
} from '../../constants/Filters';
import { fetchDistinctC4TSUsers } from '../../services/apiService'; // NEW: Import the user fetcher

// UNCHANGED: Props interface
interface LayoutProps {}

const Layout: React.FC<LayoutProps> = () => {
  // UNCHANGED: location logic
  const location = useLocation();

  // CHANGED: The state object now uses `user` instead of `department`
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    timeframe: DEFAULT_TIMEFRAME_ID,
    user: DEFAULT_USER_ID, // Was department
    region: DEFAULT_REGION_ID,
  });

  // NEW: Fetch the list of distinct users for the dropdown using React Query
  const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({
    queryKey: ['distinctC4TSUsers'], // A unique key for this query
    queryFn: fetchDistinctC4TSUsers, // The new function from our apiService
    staleTime: 1000 * 60 * 60, // Optional: Cache this list for 1 hour
    refetchOnWindowFocus: false, // Optional: Don't refetch on window focus
  });

  // NEW: Create the dynamic options for the user dropdown using the fetched data
  const userFilterOptions: FilterOption[] = useMemo(() => {
    if (!distinctUsers) {
      // While loading or if there's an error, just show "All Users"
      return [ALL_USERS_OPTION];
    }
    // Transform the string array of user IDs into an array of { id, label } objects
    const userOptions = distinctUsers.map(user => ({ id: user, label: user }));
    // Prepend the "All Users" option to the list
    return [ALL_USERS_OPTION, ...userOptions];
  }, [distinctUsers]);

  // CHANGED: Handler is now for `user`
  const handleTimeframeChange = (timeframeId: TimeframeId) => setActiveFilters(prev => ({ ...prev, timeframe: timeframeId }));
  const handleUserChange = (userId: UserId) => setActiveFilters(prev => ({ ...prev, user: userId }));
  const handleRegionChange = (regionId: RegionId) => setActiveFilters(prev => ({ ...prev, region: regionId }));

  // UNCHANGED: Title logic
  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/': return 'Analytics Overview';
      case '/c4ts': return 'C4TS Analytics';
      case '/structurizr': return 'Structurizr Analytics';
      default: return 'EA Analytics';
    }
  };

  // UNCHANGED: Overall JSX Structure
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {/* CHANGED: PageHeader now receives dynamic user options and loading state */}
          <PageHeader
            title={getPageTitle()}
            activeFilters={activeFilters}
            onTimeframeChange={handleTimeframeChange}
            onUserChange={handleUserChange}
            onRegionChange={handleRegionChange}
            userFilterOptions={userFilterOptions}
            isLoadingUsers={isLoadingUsers}
          />
          <div className="mt-6">
            <Outlet context={{ activeFilters }} />
          </div>
        </main>
        <Footer lastUpdated="Today, at 10:00 AM" refreshInterval={4} />
      </div>
    </div>
  );
};

export default Layout;