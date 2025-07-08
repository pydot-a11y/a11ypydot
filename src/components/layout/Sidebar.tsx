import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="w-56 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-primary-500 text-xl font-semibold">EA Analytics</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <NavLink 
            to="/"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Analytics Overview
          </NavLink>
        </div>

        <div className="px-4 mt-2">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            DETAILED ANALYTICS
          </h3>
          
          <NavLink 
            to="/structurizr"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
              <line x1="7" y1="8" x2="17" y2="8" strokeWidth="2"/>
              <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2"/>
              <line x1="7" y1="16" x2="13" y2="16" strokeWidth="2"/>
            </svg>
            Structurizr Analytics
          </NavLink>
          
          <NavLink 
            to="/c4ts"
            className={({ isActive }) => 
              `flex items-center px-3 py-2 mt-1 rounded-md text-sm font-medium ${
                isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            C4TS Analytics
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;