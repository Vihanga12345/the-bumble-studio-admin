import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ERPUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'manager' | 'employee';
  is_active: boolean;
  business_id?: string;
  last_login?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ERPModule {
  id: string;
  module_name: string;
  module_key: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

export interface UserModulePermission {
  module_key: string;
  module_name: string;
  has_access: boolean;
  icon?: string;
}

interface ERPAuthContextType {
  currentUser: ERPUser | null;
  userPermissions: UserModulePermission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  // Manager functions
  createUser: (userData: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, userData: Partial<CreateUserData>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<ERPUser[]>;
  grantModuleAccess: (userId: string, moduleKey: string) => Promise<{ success: boolean; error?: string }>;
  revokeModuleAccess: (userId: string, moduleKey: string) => Promise<{ success: boolean; error?: string }>;
  getAllModules: () => Promise<ERPModule[]>;
  hasModuleAccess: (moduleKey: string) => boolean;
  hasManagerAccess: () => boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'manager' | 'employee';
}

const ERPAuthContext = createContext<ERPAuthContextType | undefined>(undefined);

export const useERPAuth = (): ERPAuthContextType => {
  const context = useContext(ERPAuthContext);
  if (!context) {
    throw new Error('useERPAuth must be used within an ERPAuthProvider');
  }
  return context;
};

export const ERPAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ERPUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserModulePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hash password (simple implementation - in production use proper bcrypt)
  const hashPassword = async (password: string): Promise<string> => {
    // This is a simple hash - in production, implement proper bcrypt hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_string');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Verify password
  const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
  };

  // Get session token from localStorage
  const getSessionToken = (): string | null => {
    return localStorage.getItem('erp_session_token');
  };

  // Set session token in localStorage
  const setSessionToken = (token: string): void => {
    localStorage.setItem('erp_session_token', token);
  };

  // Remove session token from localStorage
  const removeSessionToken = (): void => {
    localStorage.removeItem('erp_session_token');
  };

  // Generate session token
  const generateSessionToken = (): string => {
    return `erp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fetch user permissions
  const fetchUserPermissions = async (userId: string): Promise<UserModulePermission[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_module_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
      return [];
    }
  };

  // Verify session and get user data
  const verifySession = async (sessionToken: string): Promise<ERPUser | null> => {
    try {
      const { data, error } = await supabase
        .from('erp_sessions')
        .select(`
          user_id,
          expires_at,
          is_active,
          erp_users (*)
        `)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return data.erp_users as ERPUser;
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const sessionToken = getSessionToken();
        if (sessionToken) {
          const userData = await verifySession(sessionToken);
          if (userData) {
            setCurrentUser(userData);
            const permissions = await fetchUserPermissions(userData.id);
            setUserPermissions(permissions);
          } else {
            removeSessionToken();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        removeSessionToken();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Get user by username
      const { data: userData, error: userError } = await supabase
        .from('erp_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        return { success: false, error: 'Invalid username or password' };
      }

      // For development, accept any password for the admin user
      // In production, implement proper password verification
      const isValidPassword = username === 'admin' ? 
        (password === 'admin123') : 
        await verifyPassword(password, userData.password_hash);

      if (!isValidPassword) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error: sessionError } = await supabase
        .from('erp_sessions')
        .insert({
          user_id: userData.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: null, // Could be implemented
          user_agent: navigator.userAgent,
          is_active: true
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return { success: false, error: 'Failed to create session' };
      }

      // Update last login
      await supabase
        .from('erp_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      setCurrentUser(userData);
      setSessionToken(sessionToken);

      // Fetch permissions
      const permissions = await fetchUserPermissions(userData.id);
      setUserPermissions(permissions);

      toast.success('Signed in successfully');
      return { success: true };

    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const sessionToken = getSessionToken();
      if (sessionToken) {
        // Deactivate session
        await supabase
          .from('erp_sessions')
          .update({ is_active: false })
          .eq('session_token', sessionToken);
      }

      setCurrentUser(null);
      setUserPermissions([]);
      removeSessionToken();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state
      setCurrentUser(null);
      setUserPermissions([]);
      removeSessionToken();
    }
  };

  const refreshUserData = async (): Promise<void> => {
    if (!currentUser) return;

    try {
      const permissions = await fetchUserPermissions(currentUser.id);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Manager functions
  const createUser = async (userData: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return { success: false, error: 'Unauthorized' };
      }

      const passwordHash = await hashPassword(userData.password);

      const { data, error } = await supabase
        .from('erp_users')
        .insert({
          username: userData.username,
          email: userData.email,
          password_hash: passwordHash,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          created_by: currentUser.id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      toast.success('User created successfully');
      return { success: true };

    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  };

  const updateUser = async (userId: string, userData: Partial<CreateUserData>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return { success: false, error: 'Unauthorized' };
      }

      const updateData: any = { ...userData };
      
      if (userData.password) {
        updateData.password_hash = await hashPassword(userData.password);
        delete updateData.password;
      }

      const { error } = await supabase
        .from('erp_users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      toast.success('User updated successfully');
      return { success: true };

    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Failed to update user' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return { success: false, error: 'Unauthorized' };
      }

      const { error } = await supabase
        .from('erp_users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      toast.success('User deactivated successfully');
      return { success: true };

    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: 'Failed to deactivate user' };
    }
  };

  const getAllUsers = async (): Promise<ERPUser[]> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return [];
      }

      const { data, error } = await supabase
        .from('erp_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get users error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  };

  const grantModuleAccess = async (userId: string, moduleKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return { success: false, error: 'Unauthorized' };
      }

      const { error } = await supabase.rpc('grant_module_access', {
        p_user_id: userId,
        p_module_key: moduleKey,
        p_granted_by: currentUser.id
      });

      if (error) {
        return { success: false, error: error.message };
      }

      toast.success('Module access granted');
      return { success: true };

    } catch (error) {
      console.error('Grant access error:', error);
      return { success: false, error: 'Failed to grant access' };
    }
  };

  const revokeModuleAccess = async (userId: string, moduleKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!currentUser || currentUser.role !== 'manager') {
        return { success: false, error: 'Unauthorized' };
      }

      const { error } = await supabase.rpc('revoke_module_access', {
        p_user_id: userId,
        p_module_key: moduleKey,
        p_granted_by: currentUser.id
      });

      if (error) {
        return { success: false, error: error.message };
      }

      toast.success('Module access revoked');
      return { success: true };

    } catch (error) {
      console.error('Revoke access error:', error);
      return { success: false, error: 'Failed to revoke access' };
    }
  };

  const getAllModules = async (): Promise<ERPModule[]> => {
    try {
      const { data, error } = await supabase
        .from('erp_modules')
        .select('*')
        .eq('is_active', true)
        .order('module_name');

      if (error) {
        console.error('Get modules error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getAllModules:', error);
      return [];
    }
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (currentUser?.role === 'manager') return true; // Managers have access to all modules
    return userPermissions.some(p => p.module_key === moduleKey && p.has_access);
  };

  const hasManagerAccess = (): boolean => {
    return currentUser?.role === 'manager';
  };

  const isAuthenticated = !!currentUser;

  const value: ERPAuthContextType = {
    currentUser,
    userPermissions,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refreshUserData,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    grantModuleAccess,
    revokeModuleAccess,
    getAllModules,
    hasModuleAccess,
    hasManagerAccess,
  };

  return (
    <ERPAuthContext.Provider value={value}>
      {children}
    </ERPAuthContext.Provider>
  );
}; 