// src/components/layout/Layout.tsx

import React, { useState, useMemo } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import Header from './Header';
import PageHeader from './PageHeader';
import Footer from './Footer';
import { ActiveFilters, TimeframeId, UserId, RegionId, FilterOption } from '../../types/common';
import { DEFAULT_TIMEFRAME_ID, DEFAULT_USER_ID, DEFAULT_REGION_ID, ALL_USERS_OPTION } from '../../constants/Filters';
import { fetchDistinctC4TSUsers } from '../../services/apiService';

const Layout: React.FC = () => {
  const location = useLocation();
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    timeframe: DEFAULT_TIMEFRAME_ID,
    user: DEFAULT_USER_ID,
    region: DEFAULT_REGION_ID,
  });

  // --- START OF FOOTER-RELATED STATE AND LOGIC ---
  
  // State to hold the timestamp of the last successful data fetch.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // State to hold the refresh interval. This could also come from a config file.
  const [refreshIntervalMinutes] = useState<number>(4); // Your original value was 4
  
  // --- END OF FOOTER-RELATED STATE AND LOGIC ---

  const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({
    queryKey: ['distinctC4TSUsers'],
    queryFn: fetchDistinctC4TSUsers,
    staleTime: 1000 * 60 * 60,
  });

  const userFilterOptions: FilterOption[] = useMemo(() => {
    if (!distinctUsers) return [ALL_USERS_OPTION];
    const userOptions = distinctUsers.map(user => ({ id: user, label: user }));
    return [ALL_USERS_OPTION, ...userOptions];
  }, [distinctUsers]);

  const handleTimeframeChange = (timeframeId: TimeframeId) => setActiveFilters(prev => ({ ...prev, timeframe: timeframeId }));
  const handleUserChange = (userId: UserId) => setActiveFilters(prev => ({ ...prev, user: userId }));
  const handleRegionChange = (regionId: RegionId) => setActiveFilters(prev => ({ ...prev, region: regionId }));

  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/': return 'Analytics Overview';
      case '/c4ts': return 'C4TS Analytics';
      case '/structurizr': return 'Structurizr Analytics';
      default: return 'EA Analytics';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
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
            {/* Pass both filters and the update function down via context */}
            <Outlet context={{ activeFilters, setLastUpdated }} />
          </div>
        </main>
        {/* Pass the lastUpdated state AND the refresh interval down to the Footer */}
        <Footer lastUpdated={lastUpdated} refreshIntervalMinutes={refreshIntervalMinutes} />
      </div>
    </div>
  );
};

export default Layout;