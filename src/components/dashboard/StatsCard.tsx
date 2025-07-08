// src/components/dashboard/StatsCard.tsx
import React from 'react';
import { StatsCardDisplayData, Trend } from '../../types/common';

interface StatsCardProps {
  items: StatsCardDisplayData[];
}

const StatsCard: React.FC<StatsCardProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-6">
        <p className="text-gray-500">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.title + index} className={`p-6 ${index > 0 ? 'border-t border-gray-200 md:border-t-0 md:border-l' : ''}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-gray-500 truncate">{item.title}</h3>
              {/* Optional: if you had specific icons per stat */}
            </div>
            <div className="mt-1">
              <p className="text-3xl font-semibold text-gray-900">{item.value}</p>
              {item.trend && (
                <div className={`mt-2 flex items-baseline text-sm ${
                  item.trend.direction === 'up' ? 'text-green-600' :
                  item.trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {item.trend.direction === 'up' && (
                    <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {item.trend.direction === 'down' && (
                     <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="ml-1"> {/* Adjusted to match original spacing more closely if icon is present */}
                    {item.trend.value.toFixed(1)}%
                  </span>
                  {/* The original has text like "vs last month" which isn't in the Trend type.
                      We can add it to StatsCardDisplayData or hardcode "vs prior period" for now.
                      Let's assume the trend value itself is the key info.
                  */}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsCard;