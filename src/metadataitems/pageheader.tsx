import React, { useState, useEffect } from 'react';
import { TIMEFRAME_OPTIONS, REGION_OPTIONS, ENVIRONMENT_OPTIONS } from '../../constants/Filters';
import {
  ActiveFilters,
  TimeframeId,
  UserId,
  RegionId,
  FilterOption,
  EnvironmentId,
  DepartmentId,
} from '../../types/common';

interface PageHeaderProps {
  title: string;
  activeFilters: ActiveFilters;
  onTimeframeChange: (timeframeId: TimeframeId) => void;
  onUserChange: (userId: UserId) => void;
  onRegionChange: (regionId: RegionId) => void;
  onEnvironmentChange: (environmentId: EnvironmentId) => void;

  // ✅ NEW
  onDepartmentChange: (departmentId: DepartmentId) => void;
  departmentFilterOptions: FilterOption[];
  isLoadingDepartments?: boolean;

  userFilterOptions: FilterOption[];
  isLoadingUsers?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  activeFilters,
  onTimeframeChange,
  onUserChange,
  onRegionChange,
  onEnvironmentChange,

  // ✅ NEW
  onDepartmentChange,
  departmentFilterOptions,
  isLoadingDepartments,

  userFilterOptions,
  isLoadingUsers,
}) => {
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDate(today.toLocaleDateString(undefined, options));
  }, []);

  const StyledSelect: React.FC<{
    label: string;
    options: { id: string; label: string }[];
    value: string;
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    loadingText?: string;
  }> = ({ label, options, value, onChange, disabled = false, loadingText }) => (
    <div>
      <label
        htmlFor={`select-${label.toLowerCase()}`}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={`select-${label.toLowerCase()}`}
          name={label.toLowerCase()}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="block w-full appearance-none rounded-md border pl-3 pr-10 py-2 text-base border-gray-300 bg-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          {disabled && loadingText ? (
            <option>{loadingText}</option>
          ) : (
            options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 sm:mt-0">{currentDate}</p>
      </div>

      {/* ✅ updated grid: now includes Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StyledSelect
          label="Timeframe"
          value={activeFilters.timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as TimeframeId)}
          options={TIMEFRAME_OPTIONS}
        />

        <StyledSelect
          label="Environment"
          value={activeFilters.environment}
          onChange={(e) => onEnvironmentChange(e.target.value as EnvironmentId)}
          options={ENVIRONMENT_OPTIONS}
        />

        {/* ✅ NEW: Department */}
        <StyledSelect
          label="Department"
          value={activeFilters.department}
          onChange={(e) => onDepartmentChange(e.target.value as DepartmentId)}
          options={departmentFilterOptions}
          disabled={!!isLoadingDepartments}
          loadingText="Loading Departments..."
        />

        <StyledSelect
          label="User (EON ID)"
          value={activeFilters.user}
          onChange={(e) => onUserChange(e.target.value as UserId)}
          options={userFilterOptions}
          disabled={!!isLoadingUsers}
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