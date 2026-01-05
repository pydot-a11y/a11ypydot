import React, { useState, useMemo } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Sidebar from './Sidebar';
import Header from './Header';
import PageHeader from './PageHeader';
import Footer from './Footer';

import {
  ActiveFilters,
  TimeframeId,
  UserId,
  RegionId,
  FilterOption,
  EnvironmentId,
  DepartmentId,
} from '../../types/common';

import {
  DEFAULT_TIMEFRAME_ID,
  DEFAULT_USER_ID,
  DEFAULT_REGION_ID,
  ALL_USERS_OPTION,
  DEFAULT_ENVIRONMENT_ID,
  ALL_DEPARTMENTS_OPTION,
  DEFAULT_DEPARTMENT_ID,
} from '../../constants/Filters';

import {
  fetchAllC4TSLogs,
  fetchRawStructurizrLogsByDate,
  fetchUsersMetadata,
  UserMetadataMap,
} from '../../services/apiService';

import {
  extractC4TSDistinctUsers,
  extractStructurizrDistinctUsers,
} from '../../utils/dataTransformer';

import { getTimeframeDates } from '../../utils/dateUtils';

interface LayoutProps {}

const Layout: React.FC<LayoutProps> = () => {
  const location = useLocation();

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    timeframe: DEFAULT_TIMEFRAME_ID,
    user: DEFAULT_USER_ID,
    region: DEFAULT_REGION_ID,
    environment: DEFAULT_ENVIRONMENT_ID,
    department: DEFAULT_DEPARTMENT_ID, // ✅ NEW
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const REFRESH_INTERVAL_MINUTES = 4;

  // 1) Fetch distinct users (existing behavior)
  const { data: distinctUsers, isLoading: isLoadingUsers } = useQuery<string[], Error>({
    queryKey: ['distinctUsersForDropdown'],
    queryFn: async () => {
      const { startDate, endDate } = getTimeframeDates('year');

      // Fetch users from both C4TS and Structurizr across all envs
      const [c4tsLogs, structurizrLogs] = await Promise.all([
        fetchAllC4TSLogs(startDate, endDate),
        fetchRawStructurizrLogsByDate(startDate, endDate),
      ]);

      const c4tsUsers = extractC4TSDistinctUsers(c4tsLogs);
      const structurizrUsers = extractStructurizrDistinctUsers(structurizrLogs);

      const allUsers = new Set([...c4tsUsers, ...structurizrUsers]);
      return Array.from(allUsers).sort();
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const userFilterOptions: FilterOption[] = useMemo(() => {
    if (!distinctUsers) return [ALL_USERS_OPTION];
    const userOptions = distinctUsers.map((user) => ({ id: user, label: user }));
    return [ALL_USERS_OPTION, ...userOptions];
  }, [distinctUsers]);

  // 2) NEW: fetch user metadata (department) based on env + ids
  const { data: usersMetadata, isLoading: isLoadingMetadata } = useQuery<UserMetadataMap, Error>({
    queryKey: ['usersMetadata', distinctUsers, activeFilters.environment],
    queryFn: async () => {
      const ids = distinctUsers || [];
      if (ids.length === 0) return {};

      // If ALL env, merge metadata from DEV/QA/PROD
      if (activeFilters.environment === 'ALL') {
        const envs: EnvironmentId[] = ['DEV', 'QA', 'PROD'];
        const results = await Promise.all(envs.map((env) => fetchUsersMetadata(ids, env)));

        // Merge: later env overwrites earlier if same user appears
        return Object.assign({}, ...results);
      }

      return fetchUsersMetadata(ids, activeFilters.environment);
    },
    enabled: !!distinctUsers && distinctUsers.length > 0,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  // 3) NEW: derive department options from metadata
  const departmentFilterOptions: FilterOption[] = useMemo(() => {
    if (!usersMetadata) return [ALL_DEPARTMENTS_OPTION];

    const departments = new Set<string>();
    Object.values(usersMetadata).forEach((meta) => {
      const dept = meta?.department?.trim();
      if (dept) departments.add(dept);
    });

    const options = Array.from(departments)
      .sort()
      .map((dept) => ({ id: dept, label: dept }));

    return [ALL_DEPARTMENTS_OPTION, ...options];
  }, [usersMetadata]);

  // Handlers (existing + new)
  const handleTimeframeChange = (timeframeId: TimeframeId) =>
    setActiveFilters((prev) => ({ ...prev, timeframe: timeframeId }));

  const handleUserChange = (userId: UserId) =>
    setActiveFilters((prev) => ({ ...prev, user: userId }));

  const handleRegionChange = (regionId: RegionId) =>
    setActiveFilters((prev) => ({ ...prev, region: regionId }));

  const handleEnvironmentChange = (id: EnvironmentId) =>
    setActiveFilters((prev) => ({
      ...prev,
      environment: id,
      department: DEFAULT_DEPARTMENT_ID, // ✅ optional: reset dept when env changes
    }));

  const handleDepartmentChange = (departmentId: DepartmentId) =>
    setActiveFilters((prev) => ({ ...prev, department: departmentId })); // ✅ NEW

  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/':
        return 'Analytics Overview';
      case '/c4ts':
        return 'C4TS Analytics';
      case '/structurizr':
        return 'Structurizr Analytics';
      default:
        return 'EA Analytics';
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
            onEnvironmentChange={handleEnvironmentChange}
            onDepartmentChange={handleDepartmentChange} // ✅ NEW
            userFilterOptions={userFilterOptions}
            departmentFilterOptions={departmentFilterOptions} // ✅ NEW
            isLoadingUsers={isLoadingUsers}
            isLoadingDepartments={isLoadingMetadata} // ✅ NEW
          />

          <div className="mt-6">
            <Outlet context={{ activeFilters, setLastUpdated, usersMetadata }} />
          </div>
        </main>
        <Footer lastUpdated={lastUpdated} refreshIntervalMinutes={REFRESH_INTERVAL_MINUTES} />
      </div>
    </div>
  );
};

export default Layout;