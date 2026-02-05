import { supabase } from '@/integrations/supabase/client';

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'info' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  order_id?: string;
}

/**
 * Create a new notification
 */
export const createNotification = async (
  title: string,
  message: string,
  type: 'order' | 'info' | 'warning' | 'error' = 'info',
  orderId?: string
): Promise<Notification | null> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        business_id: BUSINESS_ID,
        title,
        message,
        type,
        read: false,
        order_id: orderId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data as Notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

/**
 * Get all notifications for the business
 */
export const getNotifications = async (limit = 50): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data as Notification[]) || [];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', BUSINESS_ID)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('business_id', BUSINESS_ID)
      .eq('read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return false;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
};

/**
 * Subscribe to new notifications (realtime)
 */
export const subscribeToNotifications = (
  onNotification: (notification: Notification) => void
) => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `business_id=eq.${BUSINESS_ID}`,
      },
      (payload) => {
        console.log('New notification received:', payload);
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

