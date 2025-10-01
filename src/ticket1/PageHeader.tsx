// src/components/layout/PageHeader.tsx

// ... (Imports and StyledSelect component definition remain the same)
import { ENVIRONMENT_OPTIONS } from '../../constants/Filters';

// --- 1. UPDATE THE PROPS INTERFACE ---
interface PageHeaderProps {
  title: string;
  activeFilters: ActiveFilters;
  onTimeframeChange: (timeframeId: TimeframeId) => void;
  onUserChange: (userId: UserId) => void;
  onRegionChange: (regionId: RegionId) => void;
  onEnvironmentChange: (environmentId: EnvironmentId) => void; // Add new prop
  userFilterOptions: FilterOption[];
  isLoadingUsers?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  activeFilters,
  onTimeframeChange,
  onUserChange,
  onRegionChange,
  onEnvironmentChange, // Destructure new prop
  userFilterOptions,
  isLoadingUsers,
}) => {
  const [currentDate, setCurrentDate] = useState<string>('');
  useEffect(() => { /* ... */ }, []);

  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 sm:mt-0">{currentDate}</p>
      </div>
      {/* --- 2. UPDATE THE GRID LAYOUT --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StyledSelect
          label="Timeframe"
          value={activeFilters.timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as TimeframeId)}
          options={TIMEFRAME_OPTIONS}
        />
        {/* 3. ADD THE NEW ENVIRONMENT DROPDOWN */}
        <StyledSelect
          label="Environment"
          value={activeFilters.environment}
          onChange={(e) => onEnvironmentChange(e.target.value as EnvironmentId)}
          options={ENVIRONMENT_OPTIONS}
        />
        <StyledSelect
          label="User (EON ID)"
          value={activeFilters.user}
          onChange={(e) => onUserChange(e.target.value as UserId)}
          options={userFilterOptions}
          disabled={isLoadingUsers}
          loadingText="Loading Users..."
        />
        <StyledSelect
          label="Region"
          value={activeFilters.region}
          onChange={(e) => onRegionChange(e.target.value as RegionId)}
          options={REGION_OPTIONS}
          disabled={true}
        />
      </div>
    </div>
  );
};

export default PageHeader;