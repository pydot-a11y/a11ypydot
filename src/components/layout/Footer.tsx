interface FooterProps {
    lastUpdated?: string;
    refreshInterval?: number;
  }
  
  const Footer = ({ 
    lastUpdated = "Today, at 10:00 am", 
    refreshInterval = 4 
  }: FooterProps) => {
    return (
      <footer className="bg-white border-t border-gray-200 py-3 px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <div>
            Last updated: {lastUpdated}
          </div>
          <div className="flex items-center mt-2 sm:mt-0">
            <span>Auto-refresh: {refreshInterval} hours</span>
            <button 
              className="ml-4 text-primary-500 hover:text-primary-600 focus:outline-none"
              aria-label="Refresh data"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    );
  };
  
  export default Footer;