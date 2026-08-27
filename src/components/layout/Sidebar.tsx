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
  Menu, 
  LogOut,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
const logo = '/bumble-logo.png';

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

const STORAGE_KEY = 'sidebar_collapsed';

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed: externalCollapsed, 
  onToggleCollapse 
}) => {
  const storedCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  const [collapsed, setCollapsed] = useState(externalCollapsed !== undefined ? externalCollapsed : storedCollapsed);
  const { hasModuleAccess, hasManagerAccess, signOut } = useERPAuth();
  const location = useLocation();

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

  const filteredNavItems = navigationItems.filter(item => {
    if (!item.moduleKey && !item.requireManager) {
      return true;
    }
    
    if (item.requireManager) {
      return hasManagerAccess();
    }
    
    if (item.moduleKey) {
      return hasModuleAccess(item.moduleKey);
    }
    
    return true;
  });
  
  useEffect(() => {
    if (externalCollapsed !== undefined && externalCollapsed !== collapsed) {
      setCollapsed(externalCollapsed);
      localStorage.setItem(STORAGE_KEY, externalCollapsed.toString());
    }
  }, [externalCollapsed]);

  const handleToggleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
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
        "h-screen bg-sidebar text-sidebar-foreground fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-sidebar-border shadow-leather",
        "hidden md:block",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="absolute right-4 top-4 block md:hidden">
        <button 
          onClick={handleToggleCollapse}
          className="p-2 rounded-md hover:bg-sidebar-accent text-gold"
        >
          <Menu size={20} />
        </button>
      </div>
      
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
          <img
            src={logo}
            alt="Bumble Studio Logo"
            className="h-12 w-auto max-w-[50px] object-contain"
          />
          {!collapsed && (
            <span className="font-playfair text-xl font-semibold tracking-tight text-sidebar-foreground animate-fade-in">Admin</span>
          )}
        </div>
        
        <button 
          onClick={handleToggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent transition-all duration-300 ease-in-out text-sidebar-foreground hover:text-gold",
            collapsed ? "rotate-180" : ""
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
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
                    "hover:bg-sidebar-accent group",
                    isActive ? 
                      "bg-sidebar-accent text-gold font-medium shadow-green-glow" : 
                      "text-sidebar-foreground/85 hover:text-sidebar-foreground",
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

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent",
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
