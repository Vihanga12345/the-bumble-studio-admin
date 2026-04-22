import React from 'react';
import NotificationDropdown from '@/components/NotificationDropdown';

const logo = '/bumble-logo.png';

const TopBar: React.FC = () => {
  return (
    <div className="bg-background/50 backdrop-blur-sm border-b border-border sticky top-0 z-30 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 md:px-6">
      {/* Left section - branding */}
      <div className="flex items-center gap-2 sm:gap-3">
        <img src={logo} alt="Bumble Studio Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
        <span className="font-playfair font-bold text-base sm:text-lg text-bumble-light">
          Admin
        </span>
      </div>
      
      {/* Right section - notifications only */}
      <div className="flex items-center">
        <NotificationDropdown />
      </div>
    </div>
  );
};

export default TopBar;
