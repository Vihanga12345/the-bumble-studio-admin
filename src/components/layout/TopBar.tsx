import React from 'react';
import NotificationDropdown from '@/components/NotificationDropdown';

const TopBar: React.FC = () => {
  return (
    <div className="bg-background/50 backdrop-blur-sm border-b border-border sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6">
      {/* Left section - can be used for breadcrumbs */}
      <div className="flex-1">
        {/* This space intentionally left empty or can be used for breadcrumbs */}
      </div>
      
      {/* Right section - notifications only */}
      <div className="flex items-center space-x-4">
        <NotificationDropdown />
      </div>
    </div>
  );
};

export default TopBar;
