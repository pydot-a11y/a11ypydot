// src/components/layout/PageHeader.tsx

import React, { useState, useEffect } from 'react';
// UNCHANGED: We still need these constants
import { TIMEFRAME_OPTIONS, REGION_OPTIONS } from '../../constants/Filters';
// CHANGED: Types now include UserId and dynamic FilterOption array
import { ActiveFilters, TimeframeId, UserId, RegionId, FilterOption } from '../../types/common';

// CHANGED: Props interface to handle dynamic users instead of static departments
interface PageHeaderProps {
  title: string;
  activeFilters: ActiveFilters;
  onTimeframeChange: (timeframeId: TimeframeId) => void;
  onUserChange: (userId: UserId) => void; // Was onDepartmentChange
  onRegionChange: (regionId: RegionId) => void;
  userFilterOptions: FilterOption[]; // NEW: Receives dynamic options from Layout
  isLoadingUsers?: boolean; // NEW: To know when to disable the user dropdown
}

// UNCHANGED: The reusable StyledSelect component
const StyledSelect: React.FC<{
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { id: string; label: string }[];
  disabled?: boolean; // Added disabled prop
}> = ({ label, value, onChange, options, disabled = false }) => (
  <div>
    <label htmlFor={`select-${label.toLowerCase()}`} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <div className="relative">
      <select
        id={`select-${label.toLowerCase()}`}
        name={label.toLowerCase()}
        value={value}
        onChange={onChange}
        disabled={disabled} // Use disabled prop
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
      >
        {disabled ? (
            <option>Loading Users...</option>
        ) : (
          options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))
        )}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  </div>
);


const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  activeFilters,
  onTimeframeChange,
  onUserChange,
  onRegionChange,
  userFilterOptions,
  isLoadingUsers,
}) => {
  // UNCHANGED: Date logic
  const [currentDate, setCurrentDate] = useState<string>('');
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString(undefined, options));
  }, []);

  // UNCHANGED: Basic JSX structure
  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1 sm:mt-0">{currentDate}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StyledSelect
          label="Timeframe"
          value={activeFilters.timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as TimeframeId)}
          options={TIMEFRAME_OPTIONS}
        />
        {/* CHANGED: This is now the dynamic User dropdown */}
        <StyledSelect
          label="User (EON ID)"
          value={activeFilters.user}
          onChange={(e) => onUserChange(e.target.value as UserId)}
          options={userFilterOptions}
          disabled={isLoadingUsers}
        />
        <StyledSelect
          label="Region"
          value={activeFilters.region}
          onChange={(e) => onRegionChange(e.target.value as RegionId)}
          options={REGION_OPTIONS}
        />
      </div>
    </div>
  );
};

export default PageHeader;