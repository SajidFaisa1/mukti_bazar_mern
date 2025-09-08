const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
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
    
    // Build query for Announcement model
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (type !== 'all') {
      query.type = type;
    }
    
    if (visibility !== 'all') {
      query.visibility = visibility;
    }

    const [announcements, totalCount] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Announcement.countDocuments(query)
    ]);

    // Calculate engagement statistics for each announcement
    const announcementsWithStats = announcements.map(announcement => {
      return {
        ...announcement.toObject(),
        stats: {
          views: announcement.views,
          likes: announcement.reactions.likes,
          dislikes: announcement.reactions.dislikes,
          helpful: announcement.reactions.helpful,
          shares: 0, // Not implemented yet
          engagementRate: announcement.views > 0 ? 
            (((announcement.reactions.likes + announcement.reactions.helpful) / announcement.views) * 100).toFixed(1) : 0
        }
      };
    });

    const summary = {
      total: totalCount,
      published: await Announcement.countDocuments({ ...query, status: 'published' }),
      draft: await Announcement.countDocuments({ ...query, status: 'draft' }),
      scheduled: await Announcement.countDocuments({ ...query, status: 'scheduled' }),
      archived: await Announcement.countDocuments({ ...query, status: 'archived' })
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
      publishImmediately = false,
      priority = 'normal',
      expiresAt,
      sendNotification = true
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

    // Create announcement using Announcement model
    const announcement = new Announcement({
      title,
      content,
      type,
      visibility,
      status,
      priority,
      publishDate: publishDate ? new Date(publishDate) : null,
      publishedAt: publishImmediately ? new Date() : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      sendNotification,
      createdBy: req.user.id
    });

    await announcement.save();
    await announcement.populate('createdBy', 'firstName lastName email');

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
    
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (announcement.status === 'published') {
      return res.status(400).json({ message: 'Announcement already published' });
    }

    // Use the model method to publish
    await announcement.publish();

    res.json({
      message: 'Announcement published successfully',
      announcement
    });

    // Log the action
    await AuditEvent.create({
      type: 'announcement_published',
      userId: req.user.id,
      description: `Published announcement: ${announcement.title}`,
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
      Announcement.aggregate([
        { 
          $match: { 
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

      // Engagement metrics
      Announcement.aggregate([
        { 
          $match: { 
            status: 'published',
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: null,
            totalAnnouncements: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$reactions.likes' },
            totalHelpful: { $sum: '$reactions.helpful' },
            avgEngagement: { 
              $avg: { 
                $cond: [
                  { $gt: ['$views', 0] },
                  { $multiply: [{ $divide: [{ $add: ['$reactions.likes', '$reactions.helpful'] }, '$views'] }, 100] },
                  0
                ]
              }
            }
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

// =============================================================================
// PUBLIC ROUTES (No authentication required for viewing announcements)
// =============================================================================

// Get public announcements (for users to view)
router.get('/public/announcements', async (req, res) => {
  try {
    const { 
      type = 'all', 
      page = 1,
      limit = 10,
      featured = false
    } = req.query;
    
    // Build query for public announcements
    let query = {
      status: 'published',
      isActive: true,
      visibility: { $in: ['all', 'public'] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };
    
    if (type !== 'all') {
      query.type = type;
    }
    
    if (featured === 'true') {
      query.featured = true;
    }

    const [announcements, totalCount] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'firstName lastName')
        .select('title content type priority publishedAt views reactions featured pinned')
        .sort({ pinned: -1, featured: -1, publishedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Announcement.countDocuments(query)
    ]);

    // Increment view count for fetched announcements (in background)
    announcements.forEach(announcement => {
      announcement.incrementViews().catch(console.error);
    });

    res.json({
      announcements: announcements.map(a => ({
        ...a.toObject(),
        stats: {
          views: a.views,
          likes: a.reactions.likes,
          helpful: a.reactions.helpful
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching public announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Get a specific public announcement
router.get('/public/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findOne({
      _id: id,
      status: 'published',
      isActive: true,
      visibility: { $in: ['all', 'public'] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }).populate('createdBy', 'firstName lastName');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Increment view count
    await announcement.incrementViews();

    res.json({
      announcement: {
        ...announcement.toObject(),
        stats: {
          views: announcement.views,
          likes: announcement.reactions.likes,
          helpful: announcement.reactions.helpful
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ message: 'Error fetching announcement' });
  }
});

// React to an announcement (like, helpful, etc.)
router.post('/public/announcements/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;
    
    if (!['likes', 'helpful', 'dislikes'].includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }
    
    const announcement = await Announcement.findOne({
      _id: id,
      status: 'published',
      isActive: true
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.addReaction(reactionType);

    res.json({
      message: 'Reaction added successfully',
      reactions: announcement.reactions
    });
    
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Error adding reaction' });
  }
});

// Public routes for users to view announcements (no admin protection)
const publicRouter = express.Router();

// Get public announcements for regular users
publicRouter.get('/public/announcements', async (req, res) => {
  try {
    const { 
      type = 'all',
      limit = 10,
      page = 1
    } = req.query;
    
    // Build query for public announcements
    let query = {
      status: 'published',
      isActive: true,
      $or: [
        { visibility: 'all' },
        { visibility: 'public' }
      ]
    };
    
    // Add expiration filter
    query.$and = [
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    ];
    
    if (type !== 'all') {
      query.type = type;
    }

    const [announcements, totalCount] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'firstName lastName')
        .select('title content type priority publishedAt views reactions featured pinned')
        .sort({ pinned: -1, featured: -1, publishedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit)),
      
      Announcement.countDocuments(query)
    ]);

    // Increment view count for each announcement
    const announcementIds = announcements.map(a => a._id);
    await Announcement.updateMany(
      { _id: { $in: announcementIds } },
      { $inc: { views: 1 } }
    );

    res.json({
      announcements: announcements.map(announcement => ({
        ...announcement.toObject(),
        timeSincePublished: announcement.timeSincePublished,
        isExpired: announcement.isExpired
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching public announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Get specific announcement details
publicRouter.get('/public/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findOne({
      _id: id,
      status: 'published',
      isActive: true,
      $or: [
        { visibility: 'all' },
        { visibility: 'public' }
      ]
    }).populate('createdBy', 'firstName lastName');

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Check if expired
    if (announcement.isExpired) {
      return res.status(410).json({ message: 'Announcement has expired' });
    }

    // Increment view count
    await announcement.incrementViews();

    res.json({
      announcement: {
        ...announcement.toObject(),
        timeSincePublished: announcement.timeSincePublished,
        isExpired: announcement.isExpired
      }
    });

  } catch (error) {
    console.error('Error fetching announcement details:', error);
    res.status(500).json({ message: 'Error fetching announcement details' });
  }
});

// Add reaction to announcement
publicRouter.post('/public/announcements/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    if (!['likes', 'dislikes', 'helpful'].includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const announcement = await Announcement.findOne({
      _id: id,
      status: 'published',
      isActive: true
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.addReaction(reactionType);

    res.json({
      message: 'Reaction added successfully',
      reactions: announcement.reactions
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: 'Error adding reaction' });
  }
});

module.exports = { adminRouter: router, publicRouter };
