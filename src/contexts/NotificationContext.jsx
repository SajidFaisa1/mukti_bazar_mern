import React, { createContext, useContext, useState, useEffect } from 'react';
import { useVendorAuth } from './VendorAuthContext';
import { useClientAuth } from './ClientAuthContext';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  
  // Determine current user with fallback to storage
  let currentUser = null;
  
  if (vendorUser) {
    currentUser = vendorUser;
  } else if (clientUser) {
    currentUser = clientUser;
  } else {
    // Fallback to storage if contexts are not available
    const storedClientUser = JSON.parse(localStorage.getItem('clientUser') || 'null');
    if (storedClientUser) {
      currentUser = storedClientUser;
    } else {
      const storedVendorUser = JSON.parse(sessionStorage.getItem('vendorUser') || 'null');
      if (storedVendorUser) {
        currentUser = storedVendorUser;
      }
    }
  }

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ws, setWs] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!currentUser || isConnecting || connectionAttempts >= 3) {
      return;
    }

    setIsConnecting(true);
    
    const websocket = new WebSocket(`ws://localhost:5005/notifications?uid=${currentUser.uid}`);
    
    websocket.onopen = () => {
      setWs(websocket);
      setConnectionAttempts(0);
      setIsConnecting(false);
    };

    websocket.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        addNotification(notification);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    websocket.onclose = () => {
      setWs(null);
      setIsConnecting(false);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket connection failed');
      setConnectionAttempts(prev => prev + 1);
      setIsConnecting(false);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [currentUser?.uid, connectionAttempts]);

  // Fetch existing notifications on load
  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`http://localhost:5005/api/notifications?uid=${currentUser.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        updateUnreadCount(data.notifications || []);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        tag: notification.id
      });
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:5005/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
      });

      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`http://localhost:5005/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
      });

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:5005/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
      });

      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const updateUnreadCount = (notificationList) => {
    const unread = notificationList.filter(notif => !notif.read).length;
    setUnreadCount(unread);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
