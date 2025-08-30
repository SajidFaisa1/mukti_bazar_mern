import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotification();
  
  // console.log('🔔 NotificationPanel render:', {
  //   notificationsCount: notifications.length,
  //   unreadCount,
  //   notifications: notifications.slice(0, 2) // Log first 2 for debugging
  // });
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, negotiation, barter

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'negotiation') return notif.type === 'negotiation';
    if (filter === 'barter') return notif.type === 'barter';
    return true;
  });

  // console.log('📋 Filtered notifications:', {
  //   filter,
  //   filteredCount: filteredNotifications.length,
  //   totalCount: notifications.length
  // });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'negotiation': return '💰';
      case 'barter': return '🔄';
      case 'order': return '📦';
      case 'payment': return '💳';
      default: return '🔔';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="notification-panel">
      {/* Notification Bell */}
      <button 
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button 
                    className="mark-all-read-btn"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="notification-filters">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button 
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
              <button 
                className={`filter-btn ${filter === 'negotiation' ? 'active' : ''}`}
                onClick={() => setFilter('negotiation')}
              >
                Negotiations
              </button>
              <button 
                className={`filter-btn ${filter === 'barter' ? 'active' : ''}`}
                onClick={() => setFilter('barter')}
              >
                Barters
              </button>
            </div>

            {/* Notification List */}
            <div className="notification-list">
              {filteredNotifications.length === 0 ? (
                <div className="no-notifications">
                  <div className="no-notifications-icon">🔔</div>
                  <p>No notifications found</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div 
                    key={notification._id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification._id);
                      }
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{getTimeAgo(notification.createdAt)}</div>
                    </div>
                    <div className="notification-actions-mini">
                      {!notification.read && (
                        <button 
                          className="mark-read-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button 
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        title="Delete notification"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* View All Link */}
            {notifications.length > 5 && (
              <div className="notification-footer">
                <button 
                  className="view-all-btn"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/notifications';
                  }}
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;
