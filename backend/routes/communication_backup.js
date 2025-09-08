const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const AuditEvent = require('../models/AuditEvent');

// Mock data for development - replace with actual database models
let conversations = [
  {
    id: '1',
    subject: 'Security Incident - Multiple Suspicious Vendors',
    participants: [
      { id: '1', name: 'Admin John', role: 'super_admin' },
      { id: '2', name: 'Admin Sarah', role: 'admin' }
    ],
    lastMessage: 'We need to investigate these accounts immediately',
    unreadCount: 2,
    type: 'admin_internal',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: '2',
    subject: 'Policy Update Discussion',
    participants: [
      { id: '1', name: 'Admin John', role: 'super_admin' },
      { id: '3', name: 'Admin Mike', role: 'moderator' }
    ],
    lastMessage: 'The new fraud detection rules look good',
    unreadCount: 0,
    type: 'admin_internal',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
  }
];

let messages = {
  '1': [
    {
      id: '1',
      conversationId: '1',
      senderId: '2',
      senderName: 'Admin Sarah',
      content: 'I found 5 vendors with identical verification documents',
      isOwn: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      id: '2',
      conversationId: '1',
      senderId: '1',
      senderName: 'Admin John',
      content: 'Can you send me their IDs? I\'ll start the investigation',
      isOwn: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  ],
  '2': [
    {
      id: '3',
      conversationId: '2',
      senderId: '3',
      senderName: 'Admin Mike',
      content: 'The new fraud detection rules look comprehensive',
      isOwn: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  ]
};

let announcements = [
  {
    id: '1',
    title: 'System Maintenance Scheduled',
    content: 'The platform will undergo scheduled maintenance on Sunday from 2 AM to 6 AM. All services will be temporarily unavailable.',
    type: 'maintenance',
    targetAudience: 'all',
    priority: 'high',
    status: 'published',
    scheduledFor: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: 'admin1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    views: 1250
  },
  {
    id: '2',
    title: 'New Security Measures Implemented',
    content: 'We have implemented additional security measures to protect against fraudulent activities. All users must verify their identity.',
    type: 'security',
    targetAudience: 'all',
    priority: 'critical',
    status: 'published',
    scheduledFor: null,
    expiresAt: null,
    createdBy: 'admin1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    views: 2150
  },
  {
    id: '3',
    title: 'Updated Terms of Service',
    content: 'Our Terms of Service have been updated to better protect our community. Please review the changes.',
    type: 'policy',
    targetAudience: 'all',
    priority: 'normal',
    status: 'draft',
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    expiresAt: null,
    createdBy: 'admin2',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    publishedAt: null,
    views: 0
  }
];

// Get all conversations for admin
router.get('/conversations', protect, adminOnly, async (req, res) => {
  try {
    // In production, filter conversations by admin permissions
    const adminConversations = conversations.map(conv => ({
      ...conv,
      unreadCount: conv.unreadCount || 0
    }));

    res.json({
      conversations: adminConversations,
      total: adminConversations.length
    });

    // Log the access
    await AuditEvent.create({
      type: 'admin_communication_access',
      userId: req.user.id,
      description: 'Accessed admin conversations',
      meta: { action: 'view_conversations' }
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', protect, adminOnly, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversationMessages = messages[conversationId] || [];

    // Mark messages as read and add isOwn flag
    const processedMessages = conversationMessages.map(message => ({
      ...message,
      isOwn: message.senderId === req.user.id
    }));

    res.json({
      messages: processedMessages,
      total: processedMessages.length
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', protect, adminOnly, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, type = 'admin_message' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const newMessage = {
      id: Date.now().toString(),
      conversationId,
      senderId: req.user.id,
      senderName: req.user.name || req.user.email,
      content: message,
      type,
      isOwn: true,
      createdAt: new Date()
    };

    // Add message to conversation
    if (!messages[conversationId]) {
      messages[conversationId] = [];
    }
    messages[conversationId].push(newMessage);

    // Update conversation timestamp
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
    }

    res.json({
      message: newMessage,
      success: true
    });

    // Log the message
    await AuditEvent.create({
      type: 'admin_message_sent',
      userId: req.user.id,
      description: `Sent message in conversation: ${conversation?.subject || conversationId}`,
      meta: { conversationId, messageType: type }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create a new conversation
router.post('/conversations', protect, adminOnly, async (req, res) => {
  try {
    const { participants, subject, type = 'admin_internal' } = req.body;

    if (!participants || !subject) {
      return res.status(400).json({ error: 'Participants and subject are required' });
    }

    const newConversation = {
      id: Date.now().toString(),
      subject,
      participants: [
        { id: req.user.id, name: req.user.name || req.user.email, role: req.user.adminRole },
        ...participants
      ],
      lastMessage: '',
      unreadCount: 0,
      type,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    conversations.push(newConversation);

    res.json({
      conversation: newConversation,
      success: true
    });

    // Log the creation
    await AuditEvent.create({
      type: 'admin_conversation_created',
      userId: req.user.id,
      description: `Created new conversation: ${subject}`,
      meta: { conversationId: newConversation.id, participants: participants.length }
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get all announcements
router.get('/announcements', protect, adminOnly, async (req, res) => {
  try {
    const { status, type, targetAudience } = req.query;
    
    let filteredAnnouncements = [...announcements];

    if (status) {
      filteredAnnouncements = filteredAnnouncements.filter(a => a.status === status);
    }

    if (type) {
      filteredAnnouncements = filteredAnnouncements.filter(a => a.type === type);
    }

    if (targetAudience) {
      filteredAnnouncements = filteredAnnouncements.filter(a => a.targetAudience === targetAudience);
    }

    // Sort by creation date (newest first)
    filteredAnnouncements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      announcements: filteredAnnouncements,
      total: filteredAnnouncements.length,
      stats: {
        total: announcements.length,
        published: announcements.filter(a => a.status === 'published').length,
        scheduled: announcements.filter(a => a.status === 'scheduled').length,
        draft: announcements.filter(a => a.status === 'draft').length
      }
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create a new announcement
router.post('/announcements', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'general',
      targetAudience = 'all',
      priority = 'normal',
      scheduledFor,
      expiresAt
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newAnnouncement = {
      id: Date.now().toString(),
      title,
      content,
      type,
      targetAudience,
      priority,
      status: scheduledFor ? 'scheduled' : 'draft',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user.id,
      createdAt: new Date(),
      publishedAt: null,
      views: 0
    };

    announcements.push(newAnnouncement);

    res.json({
      announcement: newAnnouncement,
      success: true
    });

    // Log the creation
    await AuditEvent.create({
      type: 'admin_announcement_created',
      userId: req.user.id,
      description: `Created announcement: ${title}`,
      meta: { 
        announcementId: newAnnouncement.id, 
        type, 
        priority, 
        targetAudience 
      }
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Publish an announcement
router.patch('/announcements/:announcementId/publish', protect, adminOnly, async (req, res) => {
  try {
    const { announcementId } = req.params;
    
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    announcement.status = 'published';
    announcement.publishedAt = new Date();

    res.json({
      announcement,
      success: true
    });

    // Log the publication
    await AuditEvent.create({
      type: 'admin_announcement_published',
      userId: req.user.id,
      description: `Published announcement: ${announcement.title}`,
      meta: { announcementId, targetAudience: announcement.targetAudience }
    });

  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(500).json({ error: 'Failed to publish announcement' });
  }
});

// Delete an announcement
router.delete('/announcements/:announcementId', protect, adminOnly, async (req, res) => {
  try {
    const { announcementId } = req.params;
    
    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const deletedAnnouncement = announcements.splice(announcementIndex, 1)[0];

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

    // Log the deletion
    await AuditEvent.create({
      type: 'admin_announcement_deleted',
      userId: req.user.id,
      description: `Deleted announcement: ${deletedAnnouncement.title}`,
      meta: { announcementId }
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Get communication statistics
router.get('/statistics', protect, adminOnly, async (req, res) => {
  try {
    const stats = {
      conversations: {
        total: conversations.length,
        active: conversations.filter(c => 
          new Date(c.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        unread: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      },
      announcements: {
        total: announcements.length,
        published: announcements.filter(a => a.status === 'published').length,
        scheduled: announcements.filter(a => a.status === 'scheduled').length,
        highPriority: announcements.filter(a => 
          a.priority === 'high' || a.priority === 'critical'
        ).length
      },
      messages: {
        total: Object.values(messages).reduce((sum, msgs) => sum + msgs.length, 0),
        today: Object.values(messages).reduce((sum, msgs) => 
          sum + msgs.filter(m => 
            new Date(m.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ).length, 0
        )
      }
    };

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching communication statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
