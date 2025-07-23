// src/components/common/Loader.tsx

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  label = 'Loading...',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center space-y-2 text-gray-500 ${className}`}
    >
      <svg
        className={`animate-spin ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span className="sr-only">{label}</span>
      {size !== 'sm' && <p>{label}</p>}
    </div>
  );
};

export default Loader;