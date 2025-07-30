// src/components/layout/Footer.tsx

import React from 'react';
import { format } from 'date-fns';

// Define the props the component now expects
interface FooterProps {
  lastUpdated: Date | null;
  refreshIntervalMinutes: number;
}

const Footer: React.FC<FooterProps> = ({ lastUpdated, refreshIntervalMinutes }) => {
    return (
        <footer className="bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
                {/* Conditionally render the "Data as of" timestamp */}
                {lastUpdated ? (
                    // Format the date for a nice display, e.g., "Data as of: 4:35:22 PM"
                    <p>Data as of: {format(lastUpdated, 'p')}</p>
                ) : (
                    // Show a placeholder while the first fetch is happening
                    <p className="animate-pulse">Fetching latest data...</p>
                )}
                
                {/* The disabled Auto-refresh button and text */}
                <div className="flex items-center space-x-2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5m11 2a9 9 0 11-2-6.32M20 20v-5h-5" />
                    </svg>
                    <span>Auto-refresh in {refreshIntervalMinutes}m</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;