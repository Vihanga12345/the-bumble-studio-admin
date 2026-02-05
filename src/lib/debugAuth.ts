import { supabase } from '@/integrations/supabase/client';

/**
 * Debug function to check authentication status
 * Call this before uploading to verify user is logged in
 */
export async function checkAuthStatus() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth error:', error);
      return {
        isAuthenticated: false,
        error: error.message,
        user: null
      };
    }

    if (!session) {
      console.warn('⚠️ No active session - user is NOT logged in');
      return {
        isAuthenticated: false,
        error: 'No active session',
        user: null
      };
    }

    console.log('✅ User is authenticated:', {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    return {
      isAuthenticated: true,
      error: null,
      user: session.user
    };
  } catch (error) {
    console.error('❌ Error checking auth:', error);
    return {
      isAuthenticated: false,
      error: (error as Error).message,
      user: null
    };
  }
}

/**
 * Get the current auth token
 */
export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('✅ Auth token found');
      return session.access_token;
    }
    console.warn('⚠️ No auth token found');
    return null;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
}



