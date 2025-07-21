// src/components/layout/Sidebar.tsx

const Sidebar: React.FC = () => {

    const navLinkClasses = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
  
    // CORRECTED: These classes use Tailwind's default blue palette.
    // The 'font-semibold' makes the active link bolder than the 'font-medium' on inactive links.
    const activeClass = "bg-blue-100 text-blue-700 font-semibold"; 
    const inactiveClass = "text-gray-600 hover:bg-gray-100 font-medium";
  
    return (
      <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <h1 className="text-primary-500 text-xl font-semibold">EA Analytics</h1>
        </div>
  
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-4">
            <NavLink
              to="/"
              end // This is crucial to ensure it's only active for the exact root path
              className={({ isActive }) => 
                `${navLinkClasses} ${isActive ? activeClass : inactiveClass}`
              }
            >
              {/* Your Original Analytics Overview SVG Icon */}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
              Analytics Overview
            </NavLink>
          </div>
  
          <div className="px-4 mt-2">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              DETAILED ANALYTICS
            </h3>
            <div className="space-y-1">
              <NavLink
                to="/structurizr"
                className={({ isActive }) =>
                  `${navLinkClasses} ${isActive ? activeClass : inactiveClass}`
                }
              >
                {/* Your Original Structurizr SVG Icon */}
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"></rect>
                  <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"></line>
                  <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2"></line>
                  <line x1="7" y1="16" x2="13" y2="16" strokeWidth="2"></line>
                </svg>
                Structurizr Analytics
              </NavLink>
  
              <NavLink
                to="/c4ts"
                className={({ isActive }) =>
                  `${navLinkClasses} ${isActive ? activeClass : inactiveClass}`
                }
              >
                {/* Your Original C4TS SVG Icon */}
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path>
                </svg>
                C4TS Analytics
              </NavLink>
            </div>
          </div>
        </nav>
      </aside>
    );
  };
  
  export default Sidebar;