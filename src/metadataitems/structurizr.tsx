type UserMetadataMap = Record<string, { department: string }>;

interface PageContextType {
  activeFilters: ActiveFilters;
  usersMetadata?: UserMetadataMap; // 👈 add
}

const outletContext = useOutletContext<PageContextType | null>();

const { activeFilters, usersMetadata } = outletContext;

const getDepartmentForUser = (eonid: string): string =>
  usersMetadata?.[eonid]?.department || 'Unknown';

const filteredLogs = useMemo(() => {
  if (!rawLogs) return [];

  // department filter (works with ALL_USERS too)
  const deptFiltered = rawLogs.filter((log) => {
    // @ts-expect-error department may not be in type yet
    const dept = activeFilters.department;
    if (!dept || dept === 'ALL_DEPARTMENTS') return true;
    return getDepartmentForUser(log.eonid) === dept;
  });

  // existing user filter
  if (activeFilters.user === 'ALL_USERS') return deptFiltered;
  return deptFiltered.filter((log) => log.eonid === activeFilters.user);
}, [rawLogs, activeFilters, usersMetadata]);

const applyFilters = (logs: RawStructurizrLog[]) => {
  // user filter
  const userFiltered =
    activeFilters.user === 'ALL_USERS'
      ? logs
      : logs.filter((log) => log.eonid === activeFilters.user);

  // department filter
  // @ts-expect-error department may not be in type yet
  const dept = activeFilters.department;
  if (!dept || dept === 'ALL_DEPARTMENTS') return userFiltered;

  return userFiltered.filter((log) => getDepartmentForUser(log.eonid) === dept);
};

const currentUsersCount = extractStructurizrDistinctUsers(applyFilters(currentLogs)).size;
const previousUsersCount = extractStructurizrDistinctUsers(applyFilters(previousLogs)).size;
return calculateTrend(currentUsersCount, previousUsersCount);