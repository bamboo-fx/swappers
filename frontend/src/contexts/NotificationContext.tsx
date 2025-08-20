import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import toast from 'react-hot-toast';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (index: number) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to swap matches
    const matchesChannel = supabase
      .channel(`swap_matches_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swap_matches',
          filter: `student_a_id=eq.${user.id},student_b_id=eq.${user.id}`,
        },
        (payload) => {
          const notification: Notification = {
            type: 'new_match',
            message: 'You have a new swap match!',
            data: payload.new,
          };
          
          setNotifications(prev => [...prev, notification]);
          toast.success(notification.message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_matches',
          filter: `student_a_id=eq.${user.id},student_b_id=eq.${user.id}`,
        },
        (payload) => {
          const { match_status } = payload.new;
          let message = '';
          
          switch (match_status) {
            case 'confirmed':
              message = 'Your swap match has been confirmed!';
              break;
            case 'rejected':
              message = 'Your swap match has been rejected.';
              break;
            case 'completed':
              message = 'Your course swap has been completed successfully!';
              break;
            default:
              message = 'Your swap match status has been updated.';
          }
          
          const notification: Notification = {
            type: 'match_update',
            message,
            data: payload.new,
          };
          
          setNotifications(prev => [...prev, notification]);
          
          if (match_status === 'confirmed' || match_status === 'completed') {
            toast.success(notification.message);
          } else {
            toast(notification.message);
          }
        }
      )
      .subscribe();

    // Subscribe to swap requests
    const requestsChannel = supabase
      .channel(`swap_requests_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          const { status } = payload.new;
          let message = '';
          
          switch (status) {
            case 'matched':
              message = 'Your swap request has been matched!';
              break;
            case 'completed':
              message = 'Your swap request has been completed!';
              break;
            case 'expired':
              message = 'Your swap request has expired.';
              break;
            default:
              message = 'Your swap request status has been updated.';
          }
          
          const notification: Notification = {
            type: 'request_update',
            message,
            data: payload.new,
          };
          
          setNotifications(prev => [...prev, notification]);
          toast(notification.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [user]);

  const markAsRead = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    markAsRead,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 