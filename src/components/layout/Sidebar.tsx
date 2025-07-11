// src/components/layout/Sidebar.tsx (Full Rebuilt Code - Corrected)
import React from 'react';
// CORRECTED: We use NavLink for its active state detection.
import { NavLink } from 'react-router-dom';

// --- YOUR ORIGINAL ICONS (UNCHANGED) ---
// We assume you have these icon components defined as they were before.
const OverviewIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const C4TSIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
const StructurizrIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>;

const navigationItems = [
    { name: 'Analytics Overview', to: '/', icon: OverviewIcon },
];

const detailedAnalyticsItems = [
    { name: 'Structurizr Analytics', to: '/structurizr', icon: StructurizrIcon },
    { name: 'C4TS Analytics', to: '/c4ts', icon: C4TSIcon },
];

const Sidebar: React.FC = () => {
    // Define the base classes and the classes for the active state
    const navLinkBaseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
    const activeClass = "bg-primary-100 text-primary-700"; // Light blue background, dark blue text for the whole item
    const inactiveClass = "text-gray-700 hover:bg-gray-100 hover:text-gray-900"; // Gray text

    const renderNavLink = (item: { name: string; to: string; icon: React.FC }, isEnd?: boolean) => (
        <NavLink
            key={item.name}
            to={item.to}
            end={isEnd} // The 'end' prop is only true for the root '/' link
            className={({ isActive }) => `${navLinkBaseClass} ${isActive ? activeClass : inactiveClass}`}
        >
            {/* The Icon component itself is unchanged. Its color will be set by the parent's text color. */}
            <item.icon />
            <span className="ml-3">{item.name}</span>
        </NavLink>
    );

    return (
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <h1 className="text-xl font-semibold text-primary-700">EA Analytics</h1>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {navigationItems.map(item => renderNavLink(item, true))}
                
                <div className="pt-4">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        DETAILED ANALYTICS
                    </h3>
                    <div className="mt-2 space-y-1">
                        {detailedAnalyticsItems.map(item => renderNavLink(item))}
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;