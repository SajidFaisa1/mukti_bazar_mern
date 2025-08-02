import React, { useState, useEffect, useRef } from 'react';
import messagingService from '../../services/messagingService';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
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
      console.log('User started typing');
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      console.log('User stopped typing');
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
    console.log('MessagingInterface - No current user found');
    console.log('Vendor from VendorAuth:', vendor);
    console.log('User from ClientAuth:', user);
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

  console.log('MessagingInterface - Current user:', currentUser);
  console.log('MessagingInterface - Current role:', currentRole);

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
          ) : (
            filterGroups().map(group => (
              <div
                key={group._id}
                className={`conversation-item ${selectedConversation?._id === group.conversation?._id ? 'active' : ''}`}
                onClick={(e) => group.conversation && handleConversationSelect(group.conversation, e)}
              >
                <div className="conversation-avatar">
                  {getInitials(group.name)}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">{group.name}</div>
                  <div className="conversation-preview">
                    {group.stats.activeMembers} members
                  </div>
                </div>
                <div className="conversation-meta">
                  <div className="conversation-time">
                    {group.stats.lastActivity && formatMessageTime(group.stats.lastActivity)}
                  </div>
                </div>
              </div>
            ))
          )}
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
                <button className="action-button">📞</button>
                <button className="action-button">📹</button>
                <button className="action-button">ℹ️</button>
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
    </div>
  );
};

export default MessagingInterface;
