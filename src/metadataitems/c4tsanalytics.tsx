interface PageContextType {
  activeFilters: ActiveFilters;
  setLastUpdated: (date: Date) => void;
  usersMetadata?: Record<string, { department: string }>;
}

const { activeFilters, setLastUpdated, usersMetadata } = outletContext;

const filteredLogs = useMemo(() => {
  if (!rawLogs) return [];

  let logs = rawLogs;

  // Env filter (already exists)
  logs =
    activeFilters.environment === 'ALL'
      ? logs
      : logs.filter(log => log.environment === activeFilters.environment);

  // User filter (already exists)
  if (activeFilters.user !== 'ALL_USERS') {
    logs = logs.filter(log => log.user === activeFilters.user);
  }

  // ✅ Department filter (NEW)
  if (activeFilters.department !== 'ALL_DEPARTMENTS' && usersMetadata) {
    const deptUsers = new Set(
      Object.entries(usersMetadata)
        .filter(([_, meta]) => meta.department === activeFilters.department)
        .map(([userid]) => userid)
    );

    logs = logs.filter(log => deptUsers.has(log.user));
  }

  return logs;
}, [rawLogs, activeFilters.environment, activeFilters.user, activeFilters.department, usersMetadata]);


const filterByUserAndDept = (logs: RawApiLog[]) => {
  let result = logs;

  if (activeFilters.environment !== 'ALL') {
    result = result.filter(log => log.environment === activeFilters.environment);
  }

  if (activeFilters.user !== 'ALL_USERS') {
    result = result.filter(log => log.user === activeFilters.user);
  }

  if (activeFilters.department !== 'ALL_DEPARTMENTS' && usersMetadata) {
    const deptUsers = new Set(
      Object.entries(usersMetadata)
        .filter(([_, meta]) => meta.department === activeFilters.department)
        .map(([userid]) => userid)
    );
    result = result.filter(log => deptUsers.has(log.user));
  }

  return result;
};


const currentUsersCount = extractC4TSDistinctUsers(filterByUserAndDept(currentLogs)).size;
const previousUsersCount = extractC4TSDistinctUsers(filterByUserAndDept(previousLogs)).size;