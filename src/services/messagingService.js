const API_BASE_URL = 'http://localhost:5005/api';

class MessagingService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Initialize WebSocket connection (for future real-time features)
  initializeSocket(uid) {
    // TODO: Implement Socket.IO connection
  }

  // Conversation Management
  async getConversations(uid, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations?uid=${uid}&role=${role}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getMessages(conversationId, uid, page = 1, limit = 50) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/conversations/${conversationId}?uid=${uid}&page=${page}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async createConversation(participant1, participant2, productId = null, initialMessage = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant1,
          participant2,
          productId,
          initialMessage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async findOrCreateConversation(userUid, userRole, vendorUid, vendorRole, productContext = null) {
    try {
      // First, try to find existing conversation
      const conversations = await this.getConversations(userUid, userRole);
      
      // Look for existing conversation with this vendor
      const existingConversation = conversations.find(conv => {
        const otherParticipant = conv.participants.find(p => p.uid !== userUid);
        return otherParticipant && otherParticipant.uid === vendorUid;
      });
      
      if (existingConversation) {
        return existingConversation;
      }
      
      // If no existing conversation, create a new one
      const participant1 = {
        uid: userUid,
        role: userRole
      };
      
      const participant2 = {
        uid: vendorUid,
        role: vendorRole
      };
      
      // Create conversation with product context
      const conversation = await this.createConversation(
        participant1, 
        participant2, 
        productContext?.productId || null,
        productContext ? `Hi! I'm interested in ${productContext.productName}` : null
      );
      
      return conversation;
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
      throw error;
    }
  }

  // Message Management
  async sendMessage(messageData) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      const result = await response.json();
      
      // Emit event for message sent
      this.emit('messageSent', { 
        message: result, 
        conversationId: messageData.conversationId, 
        senderUid: messageData.senderUid 
      });
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId, uid, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
      return await response.json();
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async deleteMessage(messageId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  async searchMessages(uid, query, conversationId = null, messageType = null, limit = 20) {
    try {
      const params = new URLSearchParams({
        uid,
        query,
        limit: limit.toString(),
      });
      
      if (conversationId) params.append('conversationId', conversationId);
      if (messageType) params.append('messageType', messageType);
      
      const response = await fetch(`${API_BASE_URL}/messages/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search messages');
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // File Upload
  async uploadAttachment(file, fileType, senderUid) {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      const response = await fetch(`${API_BASE_URL}/messages/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64,
          fileType,
          senderUid,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload attachment');
      }
      return await response.json();
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  // Group Management
  async getGroups(uid, category = null, city = null, district = null) {
    try {
      const params = new URLSearchParams({ uid });
      if (category) params.append('category', category);
      if (city) params.append('city', city);
      if (district) params.append('district', district);
      
      const response = await fetch(`${API_BASE_URL}/groups?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  }

  async discoverGroups(search = '', category = null, city = null, district = null, limit = 20) {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (city) params.append('city', city);
      if (district) params.append('district', district);
      
      const response = await fetch(`${API_BASE_URL}/groups/discover?${params}`);
      if (!response.ok) {
        throw new Error('Failed to discover groups');
      }
      return await response.json();
    } catch (error) {
      console.error('Error discovering groups:', error);
      throw error;
    }
  }

  async getGroup(groupId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}?uid=${uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch group');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  async createGroup(groupData) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create group');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async joinGroup(groupId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to join group');
      }
      return await response.json();
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  async leaveGroup(groupId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave group');
      }
      return await response.json();
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  async inviteToGroup(groupId, inviterUid, inviteeUid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviterUid, inviteeUid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Invite API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to invite to group (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error inviting to group:', error);
      throw error;
    }
  }

  // Group invitations
  async getGroupInvitations(uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/invitations?uid=${uid}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Get invitations API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch invitations (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  }

  async acceptGroupInvitation(invitationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }
      return await response.json();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  async rejectGroupInvitation(invitationId, uid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject invitation');
      }
      return await response.json();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  }

  // Group member management
  async updateMemberRole(groupId, memberId, newRole, adminUid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newRole: newRole, uid: adminUid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update role API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to update member role (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  async banGroupMember(groupId, memberId, adminUid, reason = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: adminUid, reason }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Ban member API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to ban member (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error banning member:', error);
      throw error;
    }
  }

  async unbanGroupMember(groupId, memberId, adminUid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: adminUid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Unban member API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to unban member (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error unbanning member:', error);
      throw error;
    }
  }

  async removeGroupMember(groupId, adminUid, memberUid) {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: memberUid, adminAction: true, adminUid }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Remove member API Error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to remove member (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // Utility Methods
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else if (diff < 604800000) { // Less than 1 week
      return `${Math.floor(diff / 86400000)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatConversationTitle(conversation, currentUserUid) {
    if (conversation.type === 'group') {
      return conversation.title || 'Group Chat';
    }
    
    // For direct conversations, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.uid !== currentUserUid);
    
    if (!otherParticipant) {
      return 'Unknown User';
    }
    
    // Try to get the best available name
    // Priority: populated user.businessName (for vendors) > populated user.name > participant.name
    if (otherParticipant.role === 'vendor') {
      return otherParticipant.user?.businessName || 
             otherParticipant.user?.name || 
             otherParticipant.name || 
             'Unknown Vendor';
    } else {
      return otherParticipant.user?.name || 
             otherParticipant.name || 
             'Unknown User';
    }
  }

  // Event Listeners for real-time updates
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Get total unread message count for user
  async getUnreadCount(uid, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/unread-count?uid=${uid}&role=${role}`);
      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }
      const data = await response.json();
      return data.unreadCount;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Mark conversation as read
  async markConversationAsRead(conversationId, uid, role) {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark conversation as read');
      }
      
      // Emit event that messages were read
      this.emit('messagesRead', { 
        conversationId, 
        userUid: uid 
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// Create singleton instance
const messagingService = new MessagingService();

export default messagingService;
