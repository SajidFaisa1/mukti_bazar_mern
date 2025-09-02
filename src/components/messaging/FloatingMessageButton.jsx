import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import messagingService from '../../services/messagingService';
import './FloatingMessageButton.css';

const FloatingMessageButton = () => {
  const { user: vendor } = useVendorAuth();
  const { user } = useClientAuth();
  
  // Determine current user
  const currentUser = vendor || user;
  const currentRole = vendor ? 'vendor' : 'client';
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Check for unread messages using the same method as MessagingInterface
  const checkUnreadMessages = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      
      // Use the same getConversations method that MessagingInterface uses
      const conversations = await messagingService.getConversations(currentUser.uid, currentRole);
      
      // Calculate total unread count from all conversations (same as MessagingInterface)
      const totalUnread = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
      
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
      
      // Set up polling to check for new messages every 5 seconds (same as MessagingInterface)
      const interval = setInterval(checkUnreadMessages, 5000);
      
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

  // Real-time updates when user focuses window
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

  // Hide for vendors (inline button now in modal) or on messaging page
  if (currentRole === 'vendor' || window.location.pathname === '/messages') {
    return null;
  }

  const navigateToMessages = () => {
    if (!currentUser) {
      // If no user is logged in, redirect to login
      window.location.href = '/login';
      return;
    }
    
    // Navigate to messages page
    window.location.href = '/messages';
  };

  return (
    <div className={`floating-message-button`} onClick={navigateToMessages}>
      <div className="message-button-content">
        <FontAwesomeIcon 
          icon={faCommentDots} 
          className="message-button-icon"
        />
        {currentUser && unreadCount > 0 && (
          <span className="floating-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default FloatingMessageButton;
