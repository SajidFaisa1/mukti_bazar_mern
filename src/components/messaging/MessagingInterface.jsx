import React, { useState, useEffect, useRef } from 'react';
import messagingService from '../../services/messagingService';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import GroupInvitations from './GroupInvitations';
import '../../styles/Messaging.css';

const MessagingInterface = ({ embedded = false, onClose = null }) => {
  const { user: vendor } = useVendorAuth();
  const { user } = useClientAuth();
  
  // Determine current user
  const currentUser = vendor || user;
  const currentRole = vendor ? 'vendor' : 'client';
  
  // State management
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userLastSeen, setUserLastSeen] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [searchVendors, setSearchVendors] = useState([]);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    category: 'general',
    isPrivate: false,
    city: '',
    district: ''
  });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagePollingRef = useRef(null);

  // Load conversations and groups on component mount
  useEffect(() => {
    if (currentUser?.uid) {
      loadConversations(true); // Initial load with loading spinner
      if (currentRole === 'vendor') {
        loadGroups();
      }
      messagingService.initializeSocket(currentUser.uid);
    }
  }, [currentUser?.uid, currentRole]);

  // Handle URL parameters to auto-select conversation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    
    if (conversationId && conversations.length > 0 && !embedded) {
      const conversation = conversations.find(c => c._id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        loadMessages(conversation._id);
        loadUserStatus(conversation);
      }
    }
  }, [conversations, embedded]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time conversation polling to update sidebar
  useEffect(() => {
    if (currentUser?.uid) {
      const pollConversations = () => {
        loadConversations(false); // Background refresh without loading spinner
      };
      
      // Poll every 5 seconds for conversation updates (increased frequency for better unread detection)
      const conversationPollingInterval = setInterval(pollConversations, 5000);
      
      return () => {
        clearInterval(conversationPollingInterval);
      };
    }
  }, [currentUser?.uid]);

  // Real-time message polling for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const pollMessages = () => {
        loadMessages(selectedConversation._id, false); // Don't show loading on polls
      };
      
      // Poll every 3 seconds for new messages
      messagePollingRef.current = setInterval(pollMessages, 3000);
      
      return () => {
        if (messagePollingRef.current) {
          clearInterval(messagePollingRef.current);
        }
      };
    }
  }, [selectedConversation?._id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
    };
  }, []);

  // Demo: Randomly simulate other user typing (remove in production)
  useEffect(() => {
    if (selectedConversation) {
      const simulateTyping = () => {
        if (Math.random() > 0.7) { // 30% chance every 8 seconds (increased chance)
          setOtherUserTyping(true);
          setTimeout(() => {
            setOtherUserTyping(false);
          }, 2000 + Math.random() * 3000); // Typing for 2-5 seconds
        }
      };
      
      const interval = setInterval(simulateTyping, 8000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Vendor search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (vendorSearchTerm) {
        handleVendorSearch(vendorSearchTerm);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [vendorSearchTerm]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }, 100);
    }
  };

  const loadConversations = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not on refreshes
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setBackgroundLoading(true);
      }
      
      const data = await messagingService.getConversations(currentUser.uid, currentRole);
      
      // Smoothly update conversations to prevent jarring UI changes
      setConversations(prevConversations => {
        // If this is a background refresh and conversations haven't substantially changed,
        // merge the data more carefully to maintain UI state
        if (!isInitialLoad && prevConversations.length > 0) {
          return data.map(newConv => {
            const existingConv = prevConversations.find(prev => prev._id === newConv._id);
            if (existingConv) {
              // Always update unread counts and last message info to ensure bold styling works
              return {
                ...existingConv,
                unreadCount: newConv.unreadCount,
                lastMessage: newConv.lastMessage,
                // Update other dynamic fields that might change
                participants: newConv.participants,
                productContext: newConv.productContext
              };
            }
            return newConv;
          });
        }
        return data;
      });
      
      // Emit event that conversations were loaded to refresh unread counts
      messagingService.emit('conversationsLoaded', { 
        userUid: currentUser.uid 
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setBackgroundLoading(false);
      }
    }
  };

  const loadGroups = async () => {
    try {
      const data = await messagingService.getGroups(currentUser.uid);
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMessages = async (conversationId, showLoading = true) => {
    try {
      if (showLoading) {
        // Only show loading for initial load, not for polls
      }
      
      // Fetch messages using the existing getMessages method
      const uid = currentUser?.uid;
      const data = await messagingService.getMessages(conversationId, uid);
      
      setMessages(prevMessages => {
        // Check if there are new messages
        const hasNewMessages = JSON.stringify(prevMessages) !== JSON.stringify(data.messages);
        
        if (hasNewMessages) {
          // If there are new messages and this is a background poll, refresh conversations
          // to update unread counts in the sidebar
          if (!showLoading) {
            setTimeout(() => {
              loadConversations(false); // Refresh sidebar with updated unread counts
            }, 100);
          }
          return data.messages;
        }
        return prevMessages;
      });
      
      if (showLoading) {
        setSelectedConversation(data.conversation);
        
        // Mark conversation as read only when user is actively viewing it
        try {
          await messagingService.markConversationAsRead(conversationId, uid, currentRole);
          
          // After marking as read, refresh conversations to update unread counts
          // Use a slightly longer delay to ensure backend has processed the read status
          setTimeout(() => {
            loadConversations(false);
          }, 300);
        } catch (error) {
          console.error('Error marking conversation as read:', error);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleConversationSelect = (conversation, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (embedded) {
      // In embedded mode, navigate to full messaging page
      window.location.href = `/messages?conversation=${conversation._id}`;
      if (onClose) onClose();
      return;
    }
    
    setSelectedConversation(conversation);
    loadMessages(conversation._id);
    
    // Load user online status for this conversation
    loadUserStatus(conversation);
    
    // Note: Don't manually reset unread count here - let the markAsRead API handle it
    // The loadMessages function will call markAsRead which will update the backend
  };

  const loadUserStatus = async (conversation) => {
    try {
      // Simulate online status - in a real app, this would come from a WebSocket or API
      const otherParticipant = conversation.participants.find(p => p.uid !== currentUser.uid);
      if (otherParticipant) {
        // Mock online status - you can replace this with actual API call
        const isOnline = Math.random() > 0.5; // Random for demo
        if (isOnline) {
          setOnlineUsers(prev => new Set([...prev, otherParticipant.uid]));
        } else {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(otherParticipant.uid);
            return newSet;
          });
          // Set last seen time (mock data)
          setUserLastSeen(prev => ({
            ...prev,
            [otherParticipant.uid]: new Date(Date.now() - Math.random() * 3600000) // Random time within last hour
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user status:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedConversation || uploadingFile) return;

    try {
      setUploadingFile(true);

      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 
                      selectedFile.type.includes('pdf') || selectedFile.type.includes('document') ? 'document' : 
                      'file';

      // Upload file
      const uploadResult = await messagingService.uploadAttachment(
        selectedFile, 
        fileType, 
        currentUser.uid
      );

      // Send message with attachment
      const messageData = {
        conversationId: selectedConversation._id,
        content: `📎 ${selectedFile.name}`,
        senderUid: currentUser.uid,
        senderRole: currentRole,
        messageType: fileType === 'image' ? 'image' : 'file',
        attachments: [{
          type: fileType,
          url: uploadResult.url,
          filename: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.type
        }]
      };

      const sentMessage = await messagingService.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setSelectedFile(null);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      // In a real app, you'd send typing indicator to other users via WebSocket
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const getOnlineStatus = (uid) => {
    if (onlineUsers.has(uid)) {
      return { status: 'online', text: 'Online' };
    } else if (userLastSeen[uid]) {
      const lastSeen = userLastSeen[uid];
      const now = new Date();
      const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return { status: 'recent', text: 'Just now' };
      } else if (diffMinutes < 60) {
        return { status: 'recent', text: `${diffMinutes}m ago` };
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return { status: 'away', text: `${hours}h ago` };
      } else {
        const days = Math.floor(diffMinutes / 1440);
        return { status: 'away', text: `${days}d ago` };
      }
    }
    return { status: 'offline', text: 'Offline' };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    const messageContent = newMessage.trim();
    
    try {
      setSending(true);
      
      const messageData = {
        conversationId: selectedConversation._id,
        content: messageContent,
        senderUid: currentUser.uid,
        senderRole: currentRole,
        messageType: 'text'
      };
      
      // Clear input field immediately BEFORE sending to prevent any race conditions
      setNewMessage('');
      
      const sentMessage = await messagingService.sendMessage(messageData);
      
      // Add message to local state
      setMessages(prev => [...prev, sentMessage]);
      
      // Update conversation in list with new last message
      setConversations(prev => 
        prev.map(conv => 
          conv._id === selectedConversation._id 
            ? { 
                ...conv, 
                lastMessage: {
                  content: sentMessage.content,
                  timestamp: sentMessage.createdAt,
                  senderName: sentMessage.senderName
                }
                // Don't manually set unreadCount - let backend calculate it based on readBy status
              }
            : conv
        )
      );
      
      // Focus back to input for next message
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Only restore message content if there was a genuine error and the input is still empty
      if (!newMessage.trim()) {
        setNewMessage(messageContent);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupForm.name.trim()) {
      alert('Group name is required');
      return;
    }
    
    try {
      const groupData = {
        ...groupForm,
        creatorUid: currentUser.uid,
        region: {
          city: groupForm.city,
          district: groupForm.district
        }
      };
      
      const newGroup = await messagingService.createGroup(groupData);
      
      // Add to local groups list
      setGroups(prev => [newGroup, ...prev]);
      
      // Close modal and reset form
      setShowCreateGroupModal(false);
      setGroupForm({
        name: '',
        description: '',
        category: 'general',
        isPrivate: false,
        city: '',
        district: ''
      });
      
      alert('Group created successfully! You can now start chatting.');
      
      // Refresh groups to get any server-side updates
      loadGroups();
      
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleShowMembers = async (conversationOrGroup) => {
    try {
      // Handle different cases:
      // 1. Group object from Groups tab (has category field, use _id)
      // 2. Conversation object (has type field, use groupId if available)
      let groupId;
      
      if (conversationOrGroup.category) {
        // This is a group object from the groups tab
        groupId = conversationOrGroup._id;
        setSelectedGroup(conversationOrGroup);
      } else if (conversationOrGroup.type === 'group') {
        // This is a group conversation object
        if (conversationOrGroup.groupId) {
          groupId = conversationOrGroup.groupId;
          // Find the group object from the groups list
          const group = groups.find(g => g._id === conversationOrGroup.groupId);
          setSelectedGroup(group);
        } else {
          alert('This group conversation needs to be updated. Please try refreshing the page.');
          return;
        }
      } else {
        // Fallback
        groupId = conversationOrGroup.groupId || conversationOrGroup._id;
        setSelectedGroup(conversationOrGroup);
      }
      
      const groupData = await messagingService.getGroup(groupId, currentUser.uid);
      
      setGroupMembers(groupData.members || []);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error fetching group members:', error);
      alert('Failed to load group members. Please try again.');
    }
  };

  // Member management handlers
  const handleUpdateMemberRole = async (member, newRole) => {
    if (!currentUser || !selectedGroup) return;
    
    try {
      await messagingService.updateMemberRole(
        selectedGroup._id, 
        member.vendor?._id || member._id, 
        newRole, 
        currentUser.uid
      );
      
      alert(`Member role updated to ${newRole} successfully!`);
      
      // Refresh group data
      loadGroups();
      await handleShowMembers(selectedGroup);
    } catch (error) {
      console.error('Error updating member role:', error);
      alert(`Failed to update member role: ${error.message}`);
    }
  };

  const handleBanMember = async (member, reason = '') => {
    if (!currentUser || !selectedGroup) return;
    
    if (!confirm(`Are you sure you want to ban ${member.businessName || member.vendor?.businessName}?`)) {
      return;
    }
    
    try {
      await messagingService.banGroupMember(
        selectedGroup._id, 
        member._id || member.vendor?._id, 
        currentUser.uid, 
        reason
      );
      
      alert('Member banned successfully!');
      
      // Refresh group data
      loadGroups();
      await handleShowMembers(selectedGroup);
    } catch (error) {
      console.error('Error banning member:', error);
      alert(`Failed to ban member: ${error.message}`);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!currentUser || !selectedGroup) return;
    
    if (!confirm(`Are you sure you want to remove ${member.businessName || member.vendor?.businessName} from the group?`)) {
      return;
    }
    
    try {
      await messagingService.removeGroupMember(
        selectedGroup._id, 
        currentUser.uid, 
        member.uid || member.vendor?.uid
      );
      
      alert('Member removed successfully!');
      
      // Refresh group data
      loadGroups();
      await handleShowMembers(selectedGroup);
    } catch (error) {
      console.error('Error removing member:', error);
      alert(`Failed to remove member: ${error.message}`);
    }
  };

  // Check if current user is admin of the selected group
  const isCurrentUserAdmin = () => {
    if (!selectedGroup || !currentUser) return false;
    
    const currentUserMember = selectedGroup.members?.find(m => 
      m.uid === currentUser.uid || m.vendor?.uid === currentUser.uid
    );
    
    return currentUserMember?.role === 'admin' || 
           currentUserMember?.permissions?.role === 'admin' ||
           selectedGroup.createdBy?.uid === currentUser.uid;
  };

  const handleAddMembersClick = () => {
    setShowMembersModal(false);
    setShowAddMembersModal(true);
    setVendorSearchTerm('');
    setSearchVendors([]);
    setSelectedVendors([]);
  };

  const handleVendorSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchVendors([]);
      return;
    }

    try {
      // Use the same API base URL as messaging service
      const API_BASE_URL = 'http://localhost:5005/api';
      const response = await fetch(`${API_BASE_URL}/vendors?search=${encodeURIComponent(searchTerm)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchVendors(data.vendors || []);
      } else {
        console.error('Vendor search failed:', response.status, response.statusText);
        setSearchVendors([]);
      }
    } catch (error) {
      console.error('Error searching vendors:', error);
      setSearchVendors([]);
    }
  };

  const handleInviteMembers = async () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor to invite');
      return;
    }

    const currentGroup = groups.find(g => g._id === (selectedConversation?.groupId || selectedConversation?._id));
    if (!currentGroup) {
      alert('No group selected');
      return;
    }

    console.log('Inviting members:', {
      groupId: currentGroup._id,
      inviterUid: currentUser.uid,
      selectedVendors: selectedVendors
    });

    try {
      const invitePromises = selectedVendors.map(vendor => {
        console.log('Inviting vendor:', { vendorUid: vendor.uid, groupId: currentGroup._id, inviterUid: currentUser.uid });
        return messagingService.inviteToGroup(currentGroup._id, currentUser.uid, vendor.uid);
      });

      await Promise.all(invitePromises);
      
      alert(`Successfully invited ${selectedVendors.length} member(s) to the group!`);
      
      // Reset and close modal
      setSelectedVendors([]);
      setShowAddMembersModal(false);
      
      // Refresh group data
      loadGroups();
      
    } catch (error) {
      console.error('Error inviting members:', error);
      alert('Failed to invite some members. Please try again.');
    }
  };

  const filterConversations = () => {
    if (!searchTerm) return conversations;
    
    return conversations.filter(conv => {
      const otherParticipant = conv.participants.find(p => p.uid !== currentUser.uid);
      const participantName = otherParticipant?.name || '';
      const lastMessageContent = conv.lastMessage?.content || '';
      
      return (
        participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lastMessageContent.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  const filterGroups = () => {
    if (!searchTerm) return groups;
    
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatMessageTime = (timestamp) => {
    return messagingService.formatMessageTime(timestamp);
  };

  const getConversationTitle = (conversation) => {
    return messagingService.formatConversationTitle(conversation, currentUser.uid);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <div className="messaging-container">
        <div className="empty-chat">
          <div className="empty-chat-icon">💬</div>
          <h3>Please log in to access messaging</h3>
          <p>You need to be logged in to send and receive messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`messaging-container ${embedded ? 'embedded' : ''}`}>
      {/* Sidebar */}
      <div className="messaging-sidebar">
        <div className={`sidebar-header ${backgroundLoading ? 'background-loading' : ''}`}>
          <h2>Messages</h2>
          {currentRole === 'vendor' && !embedded && (
            <div className="messaging-tabs">
              <button
                className={`tab-button ${activeTab === 'conversations' ? 'active' : ''}`}
                onClick={() => setActiveTab('conversations')}
              >
                Direct
              </button>
              <button
                className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => setActiveTab('groups')}
              >
                Groups
              </button>
              <button
                className={`tab-button ${activeTab === 'invitations' ? 'active' : ''}`}
                onClick={() => setActiveTab('invitations')}
              >
                Invitations
              </button>
            </div>
          )}
        </div>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="conversations-list">
          {loading ? (
            <div className="loading-conversations">Loading...</div>
          ) : activeTab === 'conversations' ? (
            filterConversations().map(conversation => {
              const otherParticipant = conversation.participants.find(p => p.uid !== currentUser.uid);
              const title = getConversationTitle(conversation);
              const hasUnread = conversation.unreadCount > 0;
              
              return (
                <div
                  key={conversation._id}
                  className={`conversation-item ${selectedConversation?._id === conversation._id ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`}
                  onClick={(e) => handleConversationSelect(conversation, e)}
                >
                  <div className="conversation-avatar">
                    {getInitials(title)}
                    {conversation.type !== 'group' && (() => {
                      const otherParticipant = conversation.participants.find(p => p.uid !== currentUser.uid);
                      if (otherParticipant) {
                        const status = getOnlineStatus(otherParticipant.uid);
                        return (
                          <div className={`online-indicator small ${status.status}`}>
                            {status.status === 'online' && <div className="pulse"></div>}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">{title}</div>
                    {conversation.productContext?.productName && (
                      <div className="conversation-product">
                        📦 {conversation.productContext.productName}
                      </div>
                    )}
                    <div className="conversation-preview">
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </div>
                  </div>
                  <div className="conversation-meta">
                    <div className="conversation-time">
                      {conversation.lastMessage?.timestamp && formatMessageTime(conversation.lastMessage.timestamp)}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="unread-count">{conversation.unreadCount}</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : activeTab === 'groups' ? (
            <div>
              {/* Groups Header with Create Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500' }}>Your Groups ({groups.length})</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => window.location.href = '/vendor/groups'}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'transparent',
                      color: '#6c757d',
                      border: '1px solid #e9ecef',
                      borderRadius: '15px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    title="Advanced group management"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                    title="Create new group"
                  >
                    + Create
                  </button>
                </div>
              </div>
              
              {/* Groups List */}
              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
                  <p style={{ fontSize: '14px', margin: 0 }}>No groups yet</p>
                  <p style={{ fontSize: '12px', margin: '5px 0 0 0' }}>Create your first group!</p>
                </div>
              ) : (
                filterGroups().map(group => (
                  <div
                    key={group._id}
                    className={`conversation-item ${selectedConversation?._id === group.conversation?._id ? 'active' : ''}`}
                  >
                    <div 
                      className="conversation-avatar"
                      onClick={(e) => group.conversation && handleConversationSelect(group.conversation, e)}
                      style={{ cursor: 'pointer' }}
                    >
                      {getInitials(group.name)}
                    </div>
                    <div 
                      className="conversation-info"
                      onClick={(e) => group.conversation && handleConversationSelect(group.conversation, e)}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      <div className="conversation-name">{group.name}</div>
                      <div className="conversation-preview">
                        {group.stats.activeMembers} members
                      </div>
                    </div>
                    <div className="conversation-meta">
                      <div className="conversation-time">
                        {group.stats.lastActivity && formatMessageTime(group.stats.lastActivity)}
                      </div>
                      <button
                        onClick={() => handleShowMembers(group)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          color: '#6c757d',
                          padding: '4px'
                        }}
                        title="Manage members"
                      >
                        👥
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'invitations' ? (
            <GroupInvitations 
              onInvitationUpdate={() => {
                loadGroups();
                loadConversations(false);
              }}
            />
          ) : null}
        </div>
      </div>
      
      {/* Chat Area - Hidden in embedded mode */}
      {!embedded && (
        <div className="chat-container">{selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  {getInitials(getConversationTitle(selectedConversation))}
                  {selectedConversation.type !== 'group' && (() => {
                    const otherParticipant = selectedConversation.participants.find(p => p.uid !== currentUser.uid);
                    if (otherParticipant) {
                      const status = getOnlineStatus(otherParticipant.uid);
                      return (
                        <div className={`online-indicator ${status.status}`}>
                          {status.status === 'online' && <div className="pulse"></div>}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="chat-header-text">
                  <h3>{getConversationTitle(selectedConversation)}</h3>
                  <p className="chat-status">
                    {selectedConversation.type === 'group' 
                      ? `${selectedConversation.participants.length} members`
                      : (() => {
                          const otherParticipant = selectedConversation.participants.find(p => p.uid !== currentUser.uid);
                          if (otherParticipant) {
                            const status = getOnlineStatus(otherParticipant.uid);
                            return (
                              <>
                                <span className={`status-text ${status.status}`}>
                                  {status.text}
                                </span>
                                {otherUserTyping && (
                                  <span className="typing-indicator">
                                    <span className="typing-text">typing</span>
                                    <span className="typing-dots">
                                      <span></span>
                                      <span></span>
                                      <span></span>
                                    </span>
                                  </span>
                                )}
                              </>
                            );
                          }
                          return 'Direct conversation';
                        })()
                    }
                  </p>
                </div>
              </div>
              <div className="chat-actions">
                {selectedConversation.type === 'group' ? (
                  <>
                    <button 
                      className="action-button" 
                      onClick={() => handleShowMembers(selectedConversation)}
                      title="View members"
                    >
                      �
                    </button>
                    <button 
                      className="action-button" 
                      onClick={handleAddMembersClick}
                      title="Add members"
                    >
                      ➕
                    </button>
                    <button className="action-button" title="Group info">ℹ️</button>
                  </>
                ) : (
                  <>
                    <button className="action-button">�📞</button>
                    <button className="action-button">📹</button>
                    <button className="action-button">ℹ️</button>
                  </>
                )}
              </div>
            </div>
            
            {/* Messages */}
            <div className="messages-container">
              {Object.entries(groupMessagesByDate(messages)).map(([date, dayMessages]) => (
                <div key={date}>
                  <div className="message-date">
                    <span>{formatDateHeader(date)}</span>
                  </div>
                  {dayMessages.map(message => (
                    <div
                      key={message._id}
                      className={`message ${message.senderUid === currentUser.uid ? 'own' : ''}`}
                    >
                      {message.senderUid !== currentUser.uid && (
                        <div className="message-avatar">
                          {getInitials(message.senderName)}
                        </div>
                      )}
                      <div className="message-bubble">
                        {message.senderUid !== currentUser.uid && selectedConversation.type === 'group' && (
                          <div className="message-sender">{message.senderName}</div>
                        )}
                        
                        {/* Product Context Display */}
                        {message.productContext && (
                          <div className="message-product-context">
                            <div className="product-info">
                              {message.productContext.productImage && (
                                <img 
                                  src={message.productContext.productImage} 
                                  alt={message.productContext.productName}
                                  className="product-thumbnail"
                                />
                              )}
                              <div className="product-details">
                                <span className="product-name">{message.productContext.productName}</span>
                                {message.productContext.productPrice && (
                                  <span className="product-price">৳{message.productContext.productPrice}</span>
                                )}
                                {message.productContext.vendorStoreId && (
                                  <span className="product-store">Store ID: {message.productContext.vendorStoreId}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Attachments Display */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="message-attachments">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="attachment">
                                {attachment.type === 'image' ? (
                                  <div className="image-attachment">
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.filename}
                                      className="attachment-image"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                    />
                                  </div>
                                ) : (
                                  <div className="file-attachment">
                                    <div className="file-icon">
                                      {attachment.type === 'document' ? '📄' : '📁'}
                                    </div>
                                    <div className="file-info">
                                      <span className="file-name">{attachment.filename}</span>
                                      <span className="file-size">
                                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    </div>
                                    <button 
                                      className="download-button"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                    >
                                      ⬇️
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="message-content">{message.content}</p>
                        <div className="message-time">
                          {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {/* Seen/Delivered indicators for own messages */}
                          {message.senderUid === currentUser.uid && (
                            <div className="message-status">
                              {message.readBy && message.readBy.length > 0 ? (
                                <span className="status-icon seen" title="Seen">✓✓</span>
                              ) : message.isDelivered ? (
                                <span className="status-icon delivered" title="Delivered">✓</span>
                              ) : (
                                <span className="status-icon sending" title="Sending">⏳</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {otherUserTyping && (
                <div className="message">
                  <div className="message-avatar">
                    {(() => {
                      const otherParticipant = selectedConversation.participants.find(p => p.uid !== currentUser.uid);
                      return getInitials(otherParticipant?.name || 'U');
                    })()}
                  </div>
                  <div className="message-bubble typing-bubble">
                    <div className="typing-animation">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="message-input-container">
              {/* File Input (hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,application/pdf,.doc,.docx,.txt"
              />
              
              {/* Selected File Preview */}
              {selectedFile && (
                <div className="file-preview">
                  <div className="file-preview-content">
                    <span className="file-preview-name">📎 {selectedFile.name}</span>
                    <div className="file-preview-actions">
                      <button 
                        type="button" 
                        onClick={handleFileUpload}
                        disabled={uploadingFile}
                        className="upload-button"
                      >
                        {uploadingFile ? '⏳' : '📤'} Upload
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="cancel-button"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage}>
                <div className="message-input-wrapper">
                  <button 
                    type="button" 
                    className="attachment-button"
                    onClick={handleAttachmentClick}
                    disabled={uploadingFile}
                  >
                    📎
                  </button>
                  <textarea
                    ref={messageInputRef}
                    className="message-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTypingStart();
                    }}
                    onKeyPress={handleKeyPress}
                    rows={1}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={!newMessage.trim() || sending}
                  >
                    {sending ? '⏳' : '➤'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the sidebar to start messaging.</p>
          </div>
        )}
        </div>
      )}
      
      {/* Group Creation Modal */}
      {showCreateGroupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '450px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2d3436', fontSize: '20px' }}>Create New Group</h2>
            
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter group name..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the group..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    resize: 'vertical',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
                  Category
                </label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="general">General</option>
                  <option value="regional">Regional</option>
                  <option value="category-based">Category Based</option>
                  <option value="business">Business</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={groupForm.city}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Your city..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '14px' }}>
                    District
                  </label>
                  <input
                    type="text"
                    value={groupForm.district}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="Your district..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={groupForm.isPrivate}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  />
                  <span>Make this group private</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e9ecef',
                    background: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Members Modal */}
      {showMembersModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2d3436', fontSize: '20px' }}>Group Members</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={handleAddMembersClick}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ➕ Add Members
              </button>
            </div>
            
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {groupMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                  <p>No members found</p>
                </div>
              ) : (
                groupMembers.map((member, index) => {
                  const isAdmin = isCurrentUserAdmin();
                  const memberRole = member.permissions?.role || member.role || 'member';
                  const isCurrentMember = member.uid === currentUser.uid || member.vendor?.uid === currentUser.uid;
                  
                  return (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: '1px solid #e9ecef',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#4CAF50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '16px'
                      }}>
                        {(member.businessName || member.vendor?.businessName || 'V')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '16px' }}>
                          {member.businessName || member.vendor?.businessName || 'Vendor'}
                          {isCurrentMember && <span style={{ color: '#6c757d', fontSize: '14px' }}> (You)</span>}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          {memberRole} • 
                          Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                      
                      {/* Role Badge */}
                      <div style={{
                        padding: '4px 8px',
                        backgroundColor: memberRole === 'admin' ? '#ff6b6b' : memberRole === 'moderator' ? '#ffa500' : '#4CAF50',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {memberRole}
                      </div>
                      
                      {/* Admin Actions */}
                      {isAdmin && !isCurrentMember && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {/* Role Change Dropdown */}
                          <select
                            onChange={(e) => {
                              if (e.target.value && e.target.value !== memberRole) {
                                handleUpdateMemberRole(member, e.target.value);
                                e.target.value = memberRole; // Reset dropdown
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Change Role</option>
                            {memberRole !== 'member' && <option value="member">Member</option>}
                            {memberRole !== 'moderator' && <option value="moderator">Moderator</option>}
                            {memberRole !== 'admin' && <option value="admin">Admin</option>}
                          </select>
                          
                          {/* Ban Button */}
                          {!member.isBanned && (
                            <button
                              onClick={() => handleBanMember(member)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ffa500',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              Ban
                            </button>
                          )}
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveMember(member)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ff6b6b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#2d3436', fontSize: '20px' }}>Add Members</h2>
              <button
                onClick={() => setShowAddMembersModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={vendorSearchTerm}
                onChange={(e) => setVendorSearchTerm(e.target.value)}
                placeholder="Search vendors by name or business..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {selectedVendors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2d3436' }}>Selected ({selectedVendors.length})</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedVendors.map(vendor => (
                    <div key={vendor.uid} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '15px',
                      fontSize: '14px'
                    }}>
                      <span>{vendor.businessName}</span>
                      <button
                        onClick={() => setSelectedVendors(prev => prev.filter(v => v.uid !== vendor.uid))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '20px' }}>
              {searchVendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                  {vendorSearchTerm ? (
                    <div>
                      <p>No vendors found for "{vendorSearchTerm}"</p>
                      <p style={{ fontSize: '12px' }}>Try searching for:</p>
                      <ul style={{ fontSize: '12px', textAlign: 'left' }}>
                        <li>Business name</li>
                        <li>Seller name</li>
                        <li>Email address</li>
                      </ul>
                      <button
                        onClick={async () => {
                          try {
                            const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
                            const response = await fetch(`${API_BASE_URL}/vendors?debug=true`);
                            const data = await response.json();
                            console.log('All vendors (debug):', data);
                            alert(`Found ${data.vendors?.length || 0} vendors in database. Check console for details.`);
                          } catch (error) {
                            console.error('Debug failed:', error);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        Debug: Show all vendors
                      </button>
                    </div>
                  ) : (
                    'Start typing to search vendors'
                  )}
                </div>
              ) : (
                searchVendors.map(vendor => (
                  <div key={vendor.uid} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    borderBottom: '1px solid #e9ecef',
                    gap: '12px',
                    cursor: 'pointer',
                    backgroundColor: selectedVendors.some(v => v.uid === vendor.uid) ? '#f0f8ff' : 'white'
                  }}
                  onClick={() => {
                    if (selectedVendors.some(v => v.uid === vendor.uid)) {
                      setSelectedVendors(prev => prev.filter(v => v.uid !== vendor.uid));
                    } else {
                      setSelectedVendors(prev => [...prev, vendor]);
                    }
                  }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#4CAF50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {vendor.businessName ? vendor.businessName[0].toUpperCase() : 'V'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '16px' }}>
                        {vendor.businessName || 'Vendor'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {vendor.city && vendor.district ? `${vendor.city}, ${vendor.district}` : 'Location not specified'}
                      </div>
                    </div>
                    {selectedVendors.some(v => v.uid === vendor.uid) && (
                      <div style={{ color: '#4CAF50', fontSize: '20px' }}>✓</div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddMembersModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e9ecef',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMembers}
                disabled={selectedVendors.length === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedVendors.length > 0 ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedVendors.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Invite {selectedVendors.length > 0 ? `(${selectedVendors.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingInterface;
