import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LanguageType, AuthState, UserStatus } from '@/types';
import { toast } from 'sonner';

// Mock users for demonstration
const MOCK_USERS = [
  {
    id: '1',
    username: 'manager',
    password: 'password123',
    email: 'manager@example.com',
    fullName: 'Manager User',
    role: 'manager' as UserRole,
    language: 'en' as LanguageType,
    status: 'active' as UserStatus,
    createdAt: new Date()
  },
  {
    id: '2',
    username: 'employee',
    password: 'password123',
    email: 'employee@example.com',
    fullName: 'Employee User',
    role: 'employee' as UserRole,
    language: 'en' as LanguageType,
    status: 'active' as UserStatus,
    createdAt: new Date()
  }
];

// Default auth state
const defaultAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAccess: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('erp_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return {
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        };
      } catch (e) {
        localStorage.removeItem('erp_user');
      }
    }
    return defaultAuthState;
  });
  
  // Session timeout (15 minutes)
  const SESSION_TIMEOUT = 15 * 60 * 1000;
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  
  // Reset activity timer on user interaction
  useEffect(() => {
    const resetTimer = () => setLastActivity(Date.now());
    
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    
    return () => {
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, []);
  
  // Check for session timeout
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        logout();
        toast.info("You've been logged out due to inactivity");
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [authState.isAuthenticated, lastActivity]);
  
  // Login function
  const login = async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Simulate API request delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find user in mock data
      const user = MOCK_USERS.find(u => 
        u.username === username && u.password === password && u.status === 'active'
      );
      
      if (!user) {
        throw new Error('Invalid username or password');
      }
      
      // Create user object without password
      const { password: _, ...userData } = user;
      
      // Store in localStorage and update state
      localStorage.setItem('erp_user', JSON.stringify(userData));
      setAuthState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      toast.success('Login successful');
      setLastActivity(Date.now());
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };
  
  // Register function
  const register = async (userData: any) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Simulate API request delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if username or email already exists
      const userExists = MOCK_USERS.some(
        u => u.username === userData.username || u.email === userData.email
      );
      
      if (userExists) {
        throw new Error('Username or email already exists');
      }
      
      // For demo purposes, just show success message
      // In a real app, this would store the user in the database
      toast.success('Registration successful. Please wait for approval.');
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('erp_user');
    setAuthState(defaultAuthState);
  };
  
  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (!authState.user) return;
    
    const updatedUser = { ...authState.user, ...userData };
    localStorage.setItem('erp_user', JSON.stringify(updatedUser));
    
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  };
  
  // Check if user has access based on roles
  const checkAccess = (roles: UserRole[]): boolean => {
    if (!authState.user) return false;
    return roles.includes(authState.user.role);
  };
  
  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    updateUser,
    checkAccess
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
