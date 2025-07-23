// src/components/common/SkeletonLoader.tsx

import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-gray-200 rounded-md animate-pulse ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      {/* The empty div creates the visual skeleton */}
    </div>
  );
};

export default SkeletonLoader;