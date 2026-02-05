
import React, { ReactNode, useState } from 'react';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNavigation from './BottomNavigation';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useERPAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {isAuthenticated && (
        <div className="hidden md:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
          />
        </div>
      )}
      
      {/* Main Content */}
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300",
        isAuthenticated ? (sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[250px]") : ""
      )}>
        {/* Desktop TopBar */}
        {isAuthenticated && (
          <div className="hidden md:block">
            <TopBar />
          </div>
        )}
        
        {/* Mobile TopBar */}
        {isAuthenticated && (
          <div className="block md:hidden bg-card border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="font-playfair text-xl font-semibold text-gold">The Bumble Studio</h1>
              <div className="flex items-center space-x-2">
                {/* You can add mobile-specific actions here */}
              </div>
            </div>
          </div>
        )}
        
        <main className={cn(
          "flex-1 transition-all duration-300",
          // Desktop padding
          "md:px-6 md:py-6",
          // Mobile padding with bottom nav space
          "px-4 py-4 pb-20",
          !isAuthenticated ? "pt-0" : "",
          "animate-fade-in"
        )}>
          <div className="max-w-full overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {isAuthenticated && <BottomNavigation />}
    </div>
  );
};

export default Layout;
