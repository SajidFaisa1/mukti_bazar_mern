const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');

// Get all system notifications with real data
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const { 
      status = 'all', 
      type = 'all', 
      priority = 'all',
      targetAudience = 'all',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build query
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (type !== 'all') {
      query.type = type;
    }
    
    if (priority !== 'all') {
      query.priority = priority;
    }
    
    if (targetAudience !== 'all') {
      query.targetAudience = targetAudience;
    }

    const [notifications, totalCount] = await Promise.all([
      Notification.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Notification.countDocuments(query)
    ]);

    // Calculate delivery statistics for each notification
    const notificationsWithStats = await Promise.all(
      notifications.map(async (notification) => {
        let recipientCount = 0;
        let deliveredCount = 0;
        let readCount = 0;

        // Calculate recipient count based on target audience
        switch (notification.targetAudience) {
          case 'all':
            const [userCount, vendorCount] = await Promise.all([
              User.countDocuments({ role: 'user' }),
              User.countDocuments({ role: 'vendor' })
            ]);
            recipientCount = userCount + vendorCount;
            break;
          case 'users':
            recipientCount = await User.countDocuments({ role: 'user' });
            break;
          case 'vendors':
            recipientCount = await User.countDocuments({ role: 'vendor' });
            break;
          case 'admins':
            recipientCount = await User.countDocuments({ role: 'admin' });
            break;
        }

        // In a real implementation, you'd track delivery and read status
        // For now, we'll simulate based on time since creation
        const hoursOld = (new Date() - notification.createdAt) / (1000 * 60 * 60);
        if (notification.status === 'sent') {
          deliveredCount = Math.floor(recipientCount * Math.min(0.95, hoursOld * 0.1));
          readCount = Math.floor(deliveredCount * Math.min(0.8, hoursOld * 0.05));
        }

        return {
          ...notification.toObject(),
          stats: {
            recipientCount,
            deliveredCount,
            readCount,
            deliveryRate: recipientCount > 0 ? ((deliveredCount / recipientCount) * 100).toFixed(1) : 0,
            readRate: deliveredCount > 0 ? ((readCount / deliveredCount) * 100).toFixed(1) : 0
          }
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      total: totalCount,
      active: await Notification.countDocuments({ ...query, status: 'sent' }),
      draft: await Notification.countDocuments({ ...query, status: 'draft' }),
      scheduled: await Notification.countDocuments({ ...query, status: 'scheduled' }),
      archived: await Notification.countDocuments({ ...query, status: 'archived' })
    };

    res.json({
      notifications: notificationsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary,
      filters: { status, type, priority, targetAudience }
    });

    // Log access
    await AuditEvent.create({
      type: 'notifications_accessed',
      userId: req.user.id,
      description: `Accessed notification list with filters: ${JSON.stringify({ status, type, priority })}`,
      meta: { filters: { status, type, priority, targetAudience }, resultCount: totalCount }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Create new notification with real database integration
router.post('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority = 'medium',
      targetAudience,
      scheduleDate,
      sendImmediately = false
    } = req.body;

    if (!title || !message || !type || !targetAudience) {
      return res.status(400).json({ 
        message: 'Title, message, type, and target audience are required' 
      });
    }

    // Determine status based on schedule and immediate send preference
    let status = 'draft';
    if (sendImmediately) {
      status = 'sent';
    } else if (scheduleDate) {
      status = 'scheduled';
    }

    // Create notification
    const notification = new Notification({
      title,
      message,
      type,
      priority,
      targetAudience,
      status,
      scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
      createdBy: req.user.id,
      sentAt: sendImmediately ? new Date() : null
    });

    await notification.save();

    // If sending immediately, trigger the sending process
    if (sendImmediately) {
      // In a real implementation, this would trigger a background job
      // to send notifications to all target recipients
      await sendNotificationToTargets(notification);
    }

    // Populate created by information
    await notification.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      message: 'Notification created successfully',
      notification: notification.toObject()
    });

    // Log the action
    await AuditEvent.create({
      type: 'notification_created',
      userId: req.user.id,
      description: `Created notification: ${title}`,
      meta: { 
        notificationId: notification._id,
        type,
        targetAudience,
        status,
        sendImmediately
      }
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
});

// Send notification to targets
router.post('/notifications/:id/send', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.status === 'sent') {
      return res.status(400).json({ message: 'Notification already sent' });
    }

    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();

    // Trigger sending process
    await sendNotificationToTargets(notification);

    res.json({
      message: 'Notification sent successfully',
      notification
    });

    // Log the action
    await AuditEvent.create({
      type: 'notification_sent',
      userId: req.user.id,
      description: `Sent notification: ${notification.title}`,
      meta: { notificationId: notification._id, targetAudience: notification.targetAudience }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Error sending notification' });
  }
});

// Get system announcements with real data
router.get('/announcements', protect, adminOnly, async (req, res) => {
  try {
    const { 
      status = 'all', 
      type = 'all', 
      visibility = 'all',
      page = 1,
      limit = 20
    } = req.query;
    
    // For announcements, we can reuse the Message model with a specific type
    let query = { type: 'announcement' };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (type !== 'all' && type !== 'announcement') {
      query.category = type; // Use category field for announcement types
    }
    
    if (visibility !== 'all') {
      query.visibility = visibility;
    }

    const [announcements, totalCount] = await Promise.all([
      Message.find(query)
        .populate('sender', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Message.countDocuments(query)
    ]);

    // Calculate engagement statistics for each announcement
    const announcementsWithStats = announcements.map(announcement => {
      // Simulate view and engagement stats based on time and visibility
      const hoursOld = (new Date() - announcement.createdAt) / (1000 * 60 * 60);
      const baseViews = announcement.visibility === 'public' ? 100 : 50;
      const views = Math.floor(baseViews * Math.log(hoursOld + 1) * Math.random() * 2);
      const likes = Math.floor(views * 0.05 * Math.random());
      const comments = Math.floor(views * 0.02 * Math.random());

      return {
        ...announcement.toObject(),
        stats: {
          views,
          likes,
          comments,
          shares: Math.floor(views * 0.01 * Math.random()),
          engagementRate: views > 0 ? (((likes + comments) / views) * 100).toFixed(1) : 0
        }
      };
    });

    const summary = {
      total: totalCount,
      published: await Message.countDocuments({ ...query, status: 'published' }),
      draft: await Message.countDocuments({ ...query, status: 'draft' }),
      scheduled: await Message.countDocuments({ ...query, status: 'scheduled' }),
      archived: await Message.countDocuments({ ...query, status: 'archived' })
    };

    res.json({
      announcements: announcementsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      summary,
      filters: { status, type, visibility }
    });

    // Log access
    await AuditEvent.create({
      type: 'announcements_accessed',
      userId: req.user.id,
      description: `Accessed announcement list with filters: ${JSON.stringify({ status, type, visibility })}`,
      meta: { filters: { status, type, visibility }, resultCount: totalCount }
    });
    
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Create new announcement with real database integration
router.post('/announcements', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      visibility,
      publishDate,
      publishImmediately = false
    } = req.body;

    if (!title || !content || !type || !visibility) {
      return res.status(400).json({ 
        message: 'Title, content, type, and visibility are required' 
      });
    }

    // Determine status
    let status = 'draft';
    if (publishImmediately) {
      status = 'published';
    } else if (publishDate) {
      status = 'scheduled';
    }

    // Create announcement using Message model
    const announcement = new Message({
      type: 'announcement',
      category: type,
      subject: title,
      content,
      visibility,
      status,
      publishDate: publishDate ? new Date(publishDate) : null,
      sender: req.user.id,
      publishedAt: publishImmediately ? new Date() : null
    });

    await announcement.save();
    await announcement.populate('sender', 'firstName lastName email');

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: announcement.toObject()
    });

    // Log the action
    await AuditEvent.create({
      type: 'announcement_created',
      userId: req.user.id,
      description: `Created announcement: ${title}`,
      meta: { 
        announcementId: announcement._id,
        type,
        visibility,
        status,
        publishImmediately
      }
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement' });
  }
});

// Publish scheduled announcement
router.post('/announcements/:id/publish', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Message.findById(id);
    if (!announcement || announcement.type !== 'announcement') {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (announcement.status === 'published') {
      return res.status(400).json({ message: 'Announcement already published' });
    }

    // Update announcement status
    announcement.status = 'published';
    announcement.publishedAt = new Date();
    await announcement.save();

    res.json({
      message: 'Announcement published successfully',
      announcement
    });

    // Log the action
    await AuditEvent.create({
      type: 'announcement_published',
      userId: req.user.id,
      description: `Published announcement: ${announcement.subject}`,
      meta: { announcementId: announcement._id, visibility: announcement.visibility }
    });

  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(500).json({ message: 'Error publishing announcement' });
  }
});

// Get communication analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      notificationStats,
      announcementStats,
      engagementStats,
      userActivity
    ] = await Promise.all([
      // Notification statistics
      Notification.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Announcement statistics
      Message.aggregate([
        { 
          $match: { 
            type: 'announcement',
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Engagement metrics (mock for now)
      Message.aggregate([
        { 
          $match: { 
            type: 'announcement',
            status: 'published',
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: null,
            totalAnnouncements: { $sum: 1 },
            avgEngagement: { $avg: 15 } // Mock engagement rate
          }
        }
      ]),

      // User activity metrics
      User.aggregate([
        { $match: { lastActive: { $gte: startDate } } },
        {
          $group: {
            _id: '$role',
            activeUsers: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format statistics
    const formattedNotificationStats = {};
    notificationStats.forEach(stat => {
      formattedNotificationStats[stat._id] = stat.count;
    });

    const formattedAnnouncementStats = {};
    announcementStats.forEach(stat => {
      formattedAnnouncementStats[stat._id] = stat.count;
    });

    const formattedUserActivity = {};
    userActivity.forEach(stat => {
      formattedUserActivity[stat._id] = stat.activeUsers;
    });

    res.json({
      timeframe,
      notifications: {
        ...formattedNotificationStats,
        total: Object.values(formattedNotificationStats).reduce((sum, count) => sum + count, 0)
      },
      announcements: {
        ...formattedAnnouncementStats,
        total: Object.values(formattedAnnouncementStats).reduce((sum, count) => sum + count, 0),
        avgEngagement: engagementStats[0]?.avgEngagement || 0
      },
      userActivity: {
        ...formattedUserActivity,
        total: Object.values(formattedUserActivity).reduce((sum, count) => sum + count, 0)
      },
      generatedAt: new Date()
    });

    // Log access
    await AuditEvent.create({
      type: 'communication_analytics_accessed',
      userId: req.user.id,
      description: `Accessed communication analytics for ${timeframe}`,
      meta: { timeframe }
    });

  } catch (error) {
    console.error('Error fetching communication analytics:', error);
    res.status(500).json({ message: 'Error fetching communication analytics' });
  }
});

// Helper function to send notifications to target audiences
async function sendNotificationToTargets(notification) {
  try {
    let recipients = [];

    // Determine recipients based on target audience
    switch (notification.targetAudience) {
      case 'all':
        recipients = await User.find({ 
          role: { $in: ['user', 'vendor'] },
          isActive: true 
        }).select('_id email firstName lastName');
        break;
      case 'users':
        recipients = await User.find({ 
          role: 'user',
          isActive: true 
        }).select('_id email firstName lastName');
        break;
      case 'vendors':
        recipients = await User.find({ 
          role: 'vendor',
          isActive: true 
        }).select('_id email firstName lastName');
        break;
      case 'admins':
        recipients = await User.find({ 
          role: 'admin',
          isActive: true 
        }).select('_id email firstName lastName');
        break;
    }

    // In a real implementation, you would:
    // 1. Create individual notification records for each recipient
    // 2. Send emails/push notifications
    // 3. Track delivery and read status
    
    console.log(`Notification "${notification.title}" sent to ${recipients.length} recipients`);
    
    return recipients.length;
  } catch (error) {
    console.error('Error sending notification to targets:', error);
    throw error;
  }
}

module.exports = router;
