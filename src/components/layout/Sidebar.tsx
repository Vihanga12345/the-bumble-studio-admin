import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Users, 
  Menu, 
  TrendingUp, 
  Settings,
  LogOut,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
const logo = '/The Bumble Studio LOGO.png';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  moduleKey?: string;
  requireManager?: boolean;
}

// Store the sidebar state in localStorage for persistence
const STORAGE_KEY = 'sidebar_collapsed';

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed: externalCollapsed, 
  onToggleCollapse 
}) => {
  // Initialize with localStorage value or default to false
  const storedCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  const [collapsed, setCollapsed] = useState(externalCollapsed !== undefined ? externalCollapsed : storedCollapsed);
  const { hasModuleAccess, hasManagerAccess, signOut } = useERPAuth();
  const location = useLocation();

  // Navigation items with module permissions
  const navigationItems: NavItem[] = [
    {
      title: 'Sales',
      path: '/sales',
      icon: <ShoppingCart size={22} />,
      moduleKey: 'sales',
    },
    {
      title: 'Inventory',
      path: '/inventory',
      icon: <Package size={22} />,
      moduleKey: 'inventory',
    },
    {
      title: 'Procurement',
      path: '/procurement',
      icon: <Truck size={22} />,
      moduleKey: 'procurement',
    },
    {
      title: 'Finance',
      path: '/financials',
      icon: <DollarSign size={22} />,
      moduleKey: 'finance',
    },
  ];

  // Filter navigation items based on user permissions
  const filteredNavItems = navigationItems.filter(item => {
    // Always show dashboard and settings
    if (!item.moduleKey && !item.requireManager) {
      return true;
    }
    
    // Check manager access
    if (item.requireManager) {
      return hasManagerAccess();
    }
    
    // Check module access
    if (item.moduleKey) {
      return hasModuleAccess(item.moduleKey);
    }
    
    return true;
  });
  
  // Sync with external collapsed state if provided
  useEffect(() => {
    if (externalCollapsed !== undefined && externalCollapsed !== collapsed) {
      setCollapsed(externalCollapsed);
      localStorage.setItem(STORAGE_KEY, externalCollapsed.toString());
    }
  }, [externalCollapsed]);

  const handleToggleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    // Save to localStorage for persistence
    localStorage.setItem(STORAGE_KEY, newCollapsedState.toString());
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsedState);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div 
      className={cn(
        "h-screen bg-sidebar fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-stitching/30 shadow-leather",
        "hidden md:block", // Hide on mobile, show on desktop
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      {/* Mobile sidebar toggle */}
      <div className="absolute right-4 top-4 block md:hidden">
        <button 
          onClick={handleToggleCollapse}
          className="p-2 rounded-md hover:bg-leather-medium text-gold"
        >
          <Menu size={20} />
        </button>
      </div>
      
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-stitching/30",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
          <img
            src={logo}
            alt="The Bumble Studio Logo"
            className="h-10 w-auto max-w-[140px] object-contain"
          />
          {!collapsed && (
            <span className="font-playfair text-xl font-semibold tracking-tight text-gold animate-fade-in">The Bumble Studio</span>
          )}
        </div>
        
        {/* Collapse button */}
        <button 
          onClick={handleToggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-leather-medium transition-all duration-300 ease-in-out text-gold",
            collapsed ? "rotate-180" : ""
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User Info removed */}
      
      {/* Navigation Links */}
      <nav className="py-4 px-2 flex-1">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                    "hover:bg-leather-medium group",
                    isActive ? 
                      "bg-gradient-gold text-leather-dark font-medium shadow-gold-glow" : 
                      "text-foreground hover:text-gold",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  <span className="transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </span>
                  
                  {!collapsed && (
                    <span className="animate-fade-in">{item.title}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign Out Button */}
      <div className="border-t border-stitching/30 p-2">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-foreground hover:text-gold hover:bg-leather-medium",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
