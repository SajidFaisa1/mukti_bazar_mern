import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import messagingService from '../../services/messagingService';
import './MessageNotificationIcon.css';

const MessageNotificationIcon = () => {
  const { user: vendor } = useVendorAuth();
  const { user } = useClientAuth();
  
  // Determine current user
  const currentUser = vendor || user;
  const currentRole = vendor ? 'vendor' : 'client';
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Check for unread messages
  const checkUnreadMessages = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      const totalUnread = await messagingService.getUnreadCount(currentUser.uid, currentRole);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load unread count on component mount and when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      checkUnreadMessages();
      
      // Set up polling to check for new messages every 30 seconds
      const interval = setInterval(checkUnreadMessages, 30000);
      
      // Listen for message events
      const handleMessageSent = () => {
        // Refresh unread count when any message is sent
        setTimeout(checkUnreadMessages, 1000);
      };
      
      const handleMessagesRead = () => {
        // Refresh unread count when messages are read
        setTimeout(checkUnreadMessages, 500);
      };
      
      const handleConversationsLoaded = () => {
        // Refresh unread count when conversations are loaded
        setTimeout(checkUnreadMessages, 200);
      };
      
      messagingService.on('messageSent', handleMessageSent);
      messagingService.on('messagesRead', handleMessagesRead);
      messagingService.on('conversationsLoaded', handleConversationsLoaded);
      
      return () => {
        clearInterval(interval);
        messagingService.off('messageSent', handleMessageSent);
        messagingService.off('messagesRead', handleMessagesRead);
        messagingService.off('conversationsLoaded', handleConversationsLoaded);
      };
    } else {
      setUnreadCount(0);
    }
  }, [currentUser?.uid, currentRole]);

  // Real-time updates when user visits messaging page
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser?.uid) {
        checkUnreadMessages();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser?.uid) {
        checkUnreadMessages();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.uid]);

  // Don't show if user is not logged in
  if (!currentUser) {
    return null;
  }

  return (
    <Link to="/messages" className="message-notification-icon">
      <div className="message-icon-container">
        <FontAwesomeIcon 
          icon={faCommentDots} 
          className={`message-icon ${unreadCount > 0 ? 'has-unread' : ''}`}
        />
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
};

export default MessageNotificationIcon;
