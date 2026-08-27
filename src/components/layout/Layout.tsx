import React, { ReactNode, useState } from 'react';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNavigation from './BottomNavigation';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useERPAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {isAuthenticated && (
        <div className="hidden md:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={(collapsed) => setSidebarCollapsed(collapsed)}
          />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300",
        isAuthenticated ? (sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[250px]") : ""
      )}>
        {isAuthenticated && (
          <div className="hidden md:block">
            <TopBar />
          </div>
        )}
        
        {isAuthenticated && (
          <div className="block md:hidden bg-card/95 backdrop-blur border-b border-border px-3 py-2 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <h1 className="font-playfair text-base font-semibold text-foreground truncate">Admin</h1>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
        
        <main className={cn(
          "flex-1 transition-all duration-300",
          "md:px-6 md:py-6",
          "px-3 py-4 pb-24 sm:px-4",
          !isAuthenticated ? "pt-0" : "",
          "animate-fade-in"
        )}>
          <div className="max-w-full overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
      
      {isAuthenticated && <BottomNavigation />}
    </div>
  );
};

export default Layout;
