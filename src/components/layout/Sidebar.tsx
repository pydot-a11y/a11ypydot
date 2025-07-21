// src/components/layout/Sidebar.tsx

// --- Placeholder Icons ---
// These represent your actual SVG icon components. As long as they use
// `fill="currentColor"` or `stroke="currentColor"`, their color will be
// correctly controlled by the parent's text color classes.
const OverviewIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>;
const C4TSIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path></svg>;
const StructurizrIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V5a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 00-1.447.894V14.11l2.553-1.276a1 1 0 00.553-.894V7.17l-1.659-.825zM4.789 13.724a1 1 0 001.447-.894V7.89l-2.553 1.276a1 1 0 00-.553.894v6.83l1.659.825zM3 5a1 1 0 00-1.447-.894l-4 2A1 1 0 00-3 7v8a1 1 0 001.447.894l4-2a1 1 0 00.553-.894V5z" clipRule="evenodd"></path></svg>;

// --- Component Definition ---

const navigationItems = [
    { name: 'Analytics Overview', to: '/', icon: OverviewIcon },
];

const detailedAnalyticsItems = [
    { name: 'Structurizr Analytics', to: '/structurizr', icon: StructurizrIcon },
    { name: 'C4TS Analytics', to: '/c4ts', icon: C4TSIcon },
];

const Sidebar: React.FC = () => {
    // Define the CSS classes for base, active, and inactive states for consistency.
    const navLinkBaseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
    const activeClass = "bg-primary-100 text-primary-700"; // Light blue background, dark blue text
    const inactiveClass = "text-gray-700 hover:bg-gray-100 hover:text-gray-900"; // Gray text with a lighter hover

    return (
        <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-16 flex items-center justify-center border-b border-gray-200">
                <h1 className="text-xl font-semibold text-primary-700">EA Analytics</h1>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {navigationItems.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.to}
                        // The 'end' prop is crucial for the root route '/' to prevent it from matching all other routes.
                        end 
                        className={({ isActive }) => 
                            `${navLinkBaseClass} ${isActive ? activeClass : inactiveClass}`
                        }
                    >
                        <item.icon />
                        <span className="ml-3">{item.name}</span>
                    </NavLink>
                ))}
                
                <div className="pt-4">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        DETAILED ANALYTICS
                    </h3>
                    <div className="mt-2 space-y-1">
                        {detailedAnalyticsItems.map(item => (
                            <NavLink
                                key={item.name}
                                to={item.to}
                                // The function passed to className is what makes the styling dynamic.
                                className={({ isActive }) => 
                                    `${navLinkBaseClass} ${isActive ? activeClass : inactiveClass}`
                                }
                            >
                                <item.icon />
                                <span className="ml-3">{item.name}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;