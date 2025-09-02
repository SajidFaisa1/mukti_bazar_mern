import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import messagingService from '../../services/messagingService';
// Legacy CSS kept for backwards animations but core styling now uses Tailwind classes.
import './MessageNotificationIcon.css';

/*
  Enhanced to ensure vendors always see the icon:
  – Adds session/localStorage fallback (vendorUser) in case context not yet hydrated on first render
  – Logs basic diagnostics (only once) to help trace why icon might be missing
*/
let didLog = false;

const MessageNotificationIcon = () => {
  const vendorAuth = useVendorAuth() || {};
  const clientAuth = useClientAuth() || {};

  // Fallback to persisted vendor session if context not ready (mirrors Navbar logic)
  let storedVendor = null;
  try {
    storedVendor = JSON.parse(
      sessionStorage.getItem('vendorUser') ||
      localStorage.getItem('vendorUser') || 'null'
    );
  } catch (_) {}

  const vendorUser = vendorAuth.user || storedVendor;
  const clientUser = clientAuth.user;

  const currentUser = vendorUser || clientUser || null;
  const currentRole = vendorUser ? 'vendor' : 'client';

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
    if (!didLog) {
      didLog = true;
      // Lightweight diagnostic once per session
      // (Remove or wrap behind env flag for production if desired)
      // eslint-disable-next-line no-console
      console.debug('[MessageNotificationIcon] mount', { hasVendor: !!vendorUser, hasClient: !!clientUser, uid: currentUser?.uid, role: currentRole });
    }
    if (currentUser?.uid) {
      checkUnreadMessages();
      const interval = setInterval(checkUnreadMessages, 30000);
      const handleMessageSent = () => setTimeout(checkUnreadMessages, 1000);
      const handleMessagesRead = () => setTimeout(checkUnreadMessages, 500);
      const handleConversationsLoaded = () => setTimeout(checkUnreadMessages, 200);
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
  if (!currentUser) return null;

  return (
    <Link
      to="/messages"
      aria-label={unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'}
      className="relative inline-flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-sm hover:from-green-500 hover:to-emerald-500 transition focus:outline-none focus:ring-2 focus:ring-green-500/50 group"
    >
      <FontAwesomeIcon
        icon={faCommentDots}
        className={`text-lg transition-transform duration-300 group-hover:scale-110 ${unreadCount>0 ? 'animate-pulse' : ''}`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {unreadCount === 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-300 opacity-0 group-hover:opacity-100 transition"></span>
      )}
    </Link>
  );
};

export default MessageNotificationIcon;
