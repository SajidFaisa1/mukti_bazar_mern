import React, { useState, useEffect, useRef } from 'react';
import messagingService from '../../services/messagingService';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import GroupInvitations from './GroupInvitations';
// Legacy stylesheet imported previously for classic styling. We keep it for now so
// any unconverted utility classes (e.g. animations) still work. New design uses Tailwind.
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

  // Some messages are arriving with a newline between every character ("h\ne\ny").
  // Heuristic: if >60% of lines are single characters and average line length < 2, collapse them.
  const normalizeMessageContent = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    // Quick reject if no newline present
    if (!text.includes('\n')) return text;
    const lines = text.split(/\r?\n/);
    if (lines.length < 3) return text; // short messages fine
    const singleCharLines = lines.filter(l => l.length === 1).length;
    const avgLen = lines.reduce((a, l) => a + l.length, 0) / lines.length;
    if (singleCharLines / lines.length > 0.6 && avgLen < 2) {
      return lines.join(''); // collapse artificial per-char newlines
    }
    return text;
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
    <div className={`w-full mx-auto max-w-7xl h-[calc(100vh-90px)] ${embedded ? 'rounded-md' : 'rounded-2xl'} flex border border-gray-200 shadow-sm bg-white/70 backdrop-blur-sm overflow-hidden`}>      
      {/* Sidebar */}
      <div className="w-80 h-full flex flex-col bg-gradient-to-b from-gray-50 to-white border-r border-gray-200">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 tracking-tight">Messages</h2>
            {backgroundLoading && <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />}
          </div>
          {currentRole === 'vendor' && !embedded && (
            <div className="mt-4 inline-flex bg-gray-100 p-1 rounded-full text-sm font-medium">
              {['conversations','groups','invitations'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full transition-colors ${activeTab===tab ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {tab==='conversations'?'Direct':tab.charAt(0).toUpperCase()+tab.slice(1)}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 relative group">
            <input
              type="text"
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-gray-200 bg-white/60 focus:bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500/40 transition shadow-sm"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400 group-focus-within:text-green-500">🔍</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto thin-scroll px-3 pb-4 space-y-1" data-testid="conversation-list">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-500 animate-pulse">Loading conversations...</div>
          ) : activeTab === 'conversations' ? (
            filterConversations().map(conv => {
              const title = getConversationTitle(conv);
              const hasUnread = conv.unreadCount > 0;
              const active = selectedConversation?._id === conv._id;
              const lastTs = conv.lastMessage?.timestamp && formatMessageTime(conv.lastMessage.timestamp);
              const otherParticipant = conv.participants.find(p => p.uid !== currentUser.uid);
              const status = otherParticipant ? getOnlineStatus(otherParticipant.uid) : null;
              return (
                <button
                  key={conv._id}
                  onClick={(e)=>handleConversationSelect(conv,e)}
                  className={`w-full text-left relative flex gap-3 p-3 rounded-xl transition shadow-sm ${active ? 'bg-green-600 text-white ring-1 ring-green-500 shadow-green-200/50' : 'bg-white/70 hover:bg-green-50 border border-transparent hover:border-green-200'} ${hasUnread && !active ? 'font-semibold' : 'font-normal'}`}
                >
                  <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold ${active ? 'bg-white/20' : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'}`}>
                    {getInitials(title)}
                    {status && (
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${active? 'border-green-600':'border-white'} ${status.status==='online'?'bg-green-400':'bg-gray-300'} shadow`}></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${active ? 'text-white' : 'text-gray-800'}`}>{title}</span>
                      {conv.productContext?.productName && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium">📦</span>
                      )}
                    </div>
                    <div className={`mt-0.5 text-xs truncate ${active ? 'text-white/80' : 'text-gray-500 group-hover:text-gray-600'}`}>{conv.lastMessage?.content || 'No messages yet'}</div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    {lastTs && <span className={`text-[10px] uppercase tracking-wide ${active?'text-white/60':'text-gray-400'}`}>{lastTs}</span>}
                    {hasUnread && (
                      <span className={`mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active?'bg-white text-green-700':'bg-green-600 text-white shadow'}`}>{conv.unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : activeTab === 'groups' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pb-1 text-xs text-gray-500">
                <span>Your Groups ({groups.length})</span>
                <div className="flex gap-1.5">
                  <button onClick={()=>window.location.href='/vendor/groups'} className="px-2 py-1 rounded-md border text-[11px] font-medium text-gray-600 hover:bg-gray-50">Manage</button>
                  <button onClick={()=>setShowCreateGroupModal(true)} className="px-2 py-1 rounded-md bg-green-600 text-white text-[11px] font-medium hover:bg-green-700 shadow">+ Create</button>
                </div>
              </div>
              {groups.length===0 ? (
                <div className="text-center text-xs text-gray-500 py-10">
                  <div className="text-3xl mb-1">👥</div>
                  <p>No groups yet</p>
                  <p className="text-[11px] mt-1 text-gray-400">Create your first group!</p>
                </div>
              ) : (
                filterGroups().map(group => {
                  const active = selectedConversation?._id === group.conversation?._id;
                  return (
                    <div key={group._id} className={`p-3 rounded-xl flex gap-3 items-center cursor-pointer transition ${active?'bg-green-600 text-white':'bg-white/70 hover:bg-green-50'}`}
                         onClick={(e)=>group.conversation && handleConversationSelect(group.conversation,e)}>
                      <div className={`h-10 w-10 flex items-center justify-center rounded-xl text-xs font-semibold ${active?'bg-white/20':'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'}`}>{getInitials(group.name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${active?'text-white':'text-gray-800'}`}>{group.name}</div>
                        <div className={`text-xs ${active?'text-white/70':'text-gray-500'}`}>{group.stats.activeMembers} members</div>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation();handleShowMembers(group);}} className={`text-lg ${active?'text-white/80 hover:text-white':'text-gray-400 hover:text-gray-600'} transition`}>👥</button>
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'invitations' ? (
            <GroupInvitations onInvitationUpdate={()=>{loadGroups();loadConversations(false);}} />
          ) : null}
        </div>
      </div>

      {/* Chat Area */}
      {!embedded && (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-white via-white to-green-50/50 relative">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 bg-white/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-semibold shadow-sm">
                    {getInitials(getConversationTitle(selectedConversation))}
                    {selectedConversation.type !== 'group' && (()=>{ const other = selectedConversation.participants.find(p=>p.uid!==currentUser.uid); if(other){ const s = getOnlineStatus(other.uid); return <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${s.status==='online'?'bg-green-400':'bg-gray-300'}`}></span>; } return null; })()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-800 truncate">{getConversationTitle(selectedConversation)}</h3>
                    <div className="text-[11px] font-medium tracking-wide uppercase flex items-center gap-2 text-gray-500">
                      {selectedConversation.type==='group' ? `${selectedConversation.participants.length} members` : (()=>{ const other = selectedConversation.participants.find(p=>p.uid!==currentUser.uid); if(other){ const s=getOnlineStatus(other.uid); return <span className={`flex items-center gap-1 ${s.status==='online'?'text-green-600':'text-gray-500'}`}>{s.text}{otherUserTyping && <span className="inline-flex items-center gap-0.5 text-green-600"><span className="animate-pulse">•</span><span className="animate-pulse delay-150">•</span><span className="animate-pulse delay-300">•</span></span>}</span>; } return 'Direct conversation'; })()}
                      {selectedConversation.productContext?.productName && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{selectedConversation.productContext.productName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.type==='group' ? (
                    <>
                      <button onClick={()=>handleShowMembers(selectedConversation)} className="h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 flex items-center justify-center shadow-sm transition" title="Members">👥</button>
                      <button onClick={handleAddMembersClick} className="h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 flex items-center justify-center shadow-sm transition" title="Add">➕</button>
                    </>
                  ) : null}
                  <button className="h-9 w-9 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 flex items-center justify-center shadow-sm transition" title="Info">ℹ️</button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" ref={messagesEndRef}>
                {Object.entries(groupMessagesByDate(messages)).map(([date, dayMessages]) => (
                  <div key={date} className="space-y-5">
                    <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"/><span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">{formatDateHeader(date)}</span><div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"/></div>
                    {dayMessages.map(message => {
                      const own = message.senderUid === currentUser.uid;
                      return (
                        <div key={message._id} className={`flex gap-3 items-end ${own?'justify-end':'justify-start'}`}>                          
                          {!own && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-semibold flex items-center justify-center shadow-sm">{getInitials(message.senderName)}</div>
                          )}
                          <div className={`max-w-[78%] flex flex-col ${own?'items-end':'items-start'}`}>
                            {message.senderUid !== currentUser.uid && selectedConversation.type==='group' && <span className="text-[11px] font-semibold text-green-600 mb-1">{message.senderName}</span>}
                            {message.productContext && (
                              <div className="mb-2 rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-2 flex gap-2 w-full shadow-sm">
                                {message.productContext.productImage && <img src={message.productContext.productImage} alt={message.productContext.productName} className="h-12 w-12 rounded-md object-cover" />}
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-emerald-800 truncate">{message.productContext.productName}</div>
                                  {message.productContext.productPrice && <div className="text-[11px] text-emerald-600 font-semibold">৳{message.productContext.productPrice}</div>}
                                </div>
                              </div>
                            )}
                            {message.attachments?.length>0 && (
                              <div className="mb-2 flex flex-col gap-2 w-full">
                                {message.attachments.map((att,i)=>(
                                  <div key={i} className="group relative flex items-center gap-3 rounded-lg border border-gray-200 bg-white/80 backdrop-blur p-2 pr-3 shadow-sm hover:border-green-300 transition cursor-pointer" onClick={()=>window.open(att.url,'_blank')}>
                                    {att.type==='image'? <img src={att.url} alt={att.filename} className="h-20 w-20 object-cover rounded-md"/> : <div className="h-12 w-12 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-lg">{att.type==='document'?'📄':'📁'}</div>}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-gray-700 truncate">{att.filename}</p>
                                      <p className="text-[11px] text-gray-400">{(att.size/1024/1024).toFixed(2)} MB</p>
                                    </div>
                                    <span className="text-sm opacity-0 group-hover:opacity-100 transition text-green-600">⬇️</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className={`relative px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${own?'bg-green-600 text-white':'bg-white border border-gray-200 text-gray-800'} `}>
                              {normalizeMessageContent(message.content)}
                              <div className={`mt-1 flex items-center gap-1 text-[10px] ${own?'text-white/70':'text-gray-400'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                {own && (
                                  <span>
                                    {message.readBy && message.readBy.length>0 ? '✓✓' : message.isDelivered ? '✓' : '…'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {otherUserTyping && (
                  <div className="flex items-end gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-semibold flex items-center justify-center shadow-sm">
                      {(()=>{const other=selectedConversation.participants.find(p=>p.uid!==currentUser.uid);return getInitials(other?.name||'U');})()}
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-gray-500 shadow-sm flex gap-1">
                      <span className="animate-pulse">•</span><span className="animate-pulse delay-150">•</span><span className="animate-pulse delay-300">•</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="mt-auto border-t border-gray-200/80 bg-white/90 backdrop-blur p-4">
                {/* Hidden file input */}
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf,.doc,.docx,.txt" />
                {selectedFile && (
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700">
                    <span className="truncate flex-1">📎 {selectedFile.name}</span>
                    <div className="flex items-center gap-2 ml-3">
                      <button onClick={handleFileUpload} disabled={uploadingFile} className="px-2 py-1 text-[11px] rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">{uploadingFile?'Uploading…':'Upload'}</button>
                      <button onClick={()=>{setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value='';}} className="px-2 py-1 text-[11px] rounded-md bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100">✕</button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button type="button" onClick={handleAttachmentClick} disabled={uploadingFile} className="h-11 w-11 flex-shrink-0 rounded-xl border border-gray-200 bg-white hover:border-green-300 hover:text-green-600 flex items-center justify-center shadow-sm transition disabled:opacity-40" title="Attach">📎</button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      rows={1}
                      onKeyPress={handleKeyPress}
                      value={newMessage}
                      onChange={(e)=>{setNewMessage(e.target.value);handleTypingStart();}}
                      placeholder="Type a message..."
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-400 shadow-sm placeholder:text-gray-400"
                    />
                  </div>
                  <button type="submit" disabled={!newMessage.trim()||sending} className="h-11 px-6 rounded-xl bg-green-600 text-white text-sm font-medium shadow hover:bg-green-700 disabled:opacity-50 flex items-center justify-center min-w-[80px] transition">{sending?'Sending…':'Send'}</button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-10">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-4xl shadow mb-6">💬</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500 max-w-xs">Choose a conversation from the left panel to start messaging.</p>
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
