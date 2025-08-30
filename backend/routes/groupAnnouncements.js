const express = require('express');
const GroupAnnouncement = require('../models/GroupAnnouncement');
const Group = require('../models/Group');
const Vendor = require('../models/Vendor');
const cloudinary = require('../config/cloudinary');
const emailService = require('../services/emailService');
const router = express.Router();

// GET /api/groups/:groupId/announcements - Get announcements for a group
router.get('/:groupId/announcements', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid, type, priority, limit = 20, page = 1 } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    // Verify user is group member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor || !group.isMember(vendor._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Build query
    const query = { group: groupId, isArchived: false };
    if (type) query.type = type;
    if (priority) query.priority = priority;
    
    // Check targeting - only show announcements meant for this user
    query.$or = [
      { 'targeting.allMembers': true },
      { 'targeting.specificMembers': vendor._id },
      { 'targeting.specificRoles': { $in: [group.getMember(vendor._id)?.role] } }
    ];
    
    // Exclude if user is in exclude list
    query['targeting.excludeMembers'] = { $ne: vendor._id };
    
    const skip = (page - 1) * limit;
    
    const announcements = await GroupAnnouncement.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy.vendor', 'businessName storeId')
      .lean();
    
    // Mark as delivered/read for user
    const announcementIds = announcements.map(a => a._id);
    await Promise.all(announcementIds.map(id => 
      GroupAnnouncement.findById(id).then(announcement => {
        if (announcement) {
          announcement.markDelivered(vendor._id);
          announcement.markRead(vendor._id);
        }
      })
    ));
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching group announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/groups/:groupId/announcements - Create group announcement
router.post('/:groupId/announcements', async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      title,
      content,
      type = 'general',
      priority = 'normal',
      attachments = [],
      targeting = { allMembers: true },
      scheduledFor,
      expiresAt,
      allowComments = true,
      allowReactions = true,
      requireAcknowledgment = false,
      poll,
      event,
      creatorUid
    } = req.body;
    
    if (!title || !content || !creatorUid) {
      return res.status(400).json({ error: 'title, content, and creatorUid are required' });
    }
    
    // Verify creator and permissions
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const creator = await Vendor.findOne({ uid: creatorUid });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    
    const member = group.getMember(creator._id);
    if (!member) {
      return res.status(403).json({ error: 'Not a group member' });
    }
    
    // Check permission to create announcements
    if (!group.hasPermission(creator._id, 'canCreateAnnouncements')) {
      return res.status(403).json({ error: 'Insufficient permissions to create announcements' });
    }
    
    // Create announcement
    const announcement = new GroupAnnouncement({
      title,
      content,
      type,
      priority,
      attachments,
      group: groupId,
      createdBy: {
        vendor: creator._id,
        uid: creatorUid,
        name: creator.businessName,
        role: member.role
      },
      targeting,
      scheduledFor,
      expiresAt,
      allowComments,
      allowReactions,
      requireAcknowledgment,
      poll,
      event,
      status: scheduledFor ? 'scheduled' : 'sent'
    });
    
    // Add recipients based on targeting
    const recipients = [];
    
    if (targeting.allMembers) {
      const activeMembers = group.members.filter(m => m.isActive && !m.isBanned);
      recipients.push(...activeMembers);
    } else {
      if (targeting.specificMembers && targeting.specificMembers.length > 0) {
        const specificMembers = group.members.filter(m => 
          targeting.specificMembers.includes(m.vendor.toString()) && m.isActive && !m.isBanned
        );
        recipients.push(...specificMembers);
      }
      
      if (targeting.specificRoles && targeting.specificRoles.length > 0) {
        const roleMembers = group.members.filter(m => 
          targeting.specificRoles.includes(m.role) && m.isActive && !m.isBanned
        );
        recipients.push(...roleMembers);
      }
    }
    
    // Remove excluded members
    const filteredRecipients = recipients.filter(m => 
      !targeting.excludeMembers?.includes(m.vendor.toString())
    );
    
    // Add recipients to announcement
    for (const recipient of filteredRecipients) {
      await announcement.addRecipient({
        vendorId: recipient.vendor,
        uid: recipient.uid
      });
    }
    
    await announcement.save();
    
    // Send notifications if not scheduled
    if (!scheduledFor && announcement.status === 'sent') {
      await sendAnnouncementNotifications(announcement, filteredRecipients);
    }
    
    const populatedAnnouncement = await GroupAnnouncement.findById(announcement._id)
      .populate('createdBy.vendor', 'businessName storeId');
    
    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    console.error('Error creating group announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PUT /api/groups/:groupId/announcements/:announcementId - Update announcement
router.put('/:groupId/announcements/:announcementId', async (req, res) => {
  try {
    const { groupId, announcementId } = req.params;
    const { uid, ...updateData } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const announcement = await GroupAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Check permissions
    const member = group.getMember(vendor._id);
    if (!announcement.canEdit(vendor._id, member?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions to edit announcement' });
    }
    
    // Update announcement
    Object.assign(announcement, updateData);
    await announcement.save();
    
    const updatedAnnouncement = await GroupAnnouncement.findById(announcementId)
      .populate('createdBy.vendor', 'businessName storeId');
    
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// POST /api/groups/:groupId/announcements/:announcementId/acknowledge - Acknowledge announcement
router.post('/:groupId/announcements/:announcementId/acknowledge', async (req, res) => {
  try {
    const { groupId, announcementId } = req.params;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const announcement = await GroupAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    await announcement.markAcknowledged(vendor._id);
    
    res.json({ message: 'Announcement acknowledged successfully' });
  } catch (error) {
    console.error('Error acknowledging announcement:', error);
    res.status(500).json({ error: 'Failed to acknowledge announcement' });
  }
});

// POST /api/groups/:groupId/announcements/:announcementId/vote - Vote on poll
router.post('/:groupId/announcements/:announcementId/vote', async (req, res) => {
  try {
    const { groupId, announcementId } = req.params;
    const { uid, optionIndex } = req.body;
    
    if (!uid || optionIndex === undefined) {
      return res.status(400).json({ error: 'uid and optionIndex are required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const announcement = await GroupAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    if (announcement.type !== 'poll') {
      return res.status(400).json({ error: 'Not a poll announcement' });
    }
    
    await announcement.voteOnPoll(vendor._id, optionIndex);
    
    const updatedAnnouncement = await GroupAnnouncement.findById(announcementId);
    res.json(updatedAnnouncement.poll);
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: error.message || 'Failed to vote on poll' });
  }
});

// POST /api/groups/:groupId/announcements/:announcementId/rsvp - RSVP to event
router.post('/:groupId/announcements/:announcementId/rsvp', async (req, res) => {
  try {
    const { groupId, announcementId } = req.params;
    const { uid, status = 'attending' } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const announcement = await GroupAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    if (announcement.type !== 'event') {
      return res.status(400).json({ error: 'Not an event announcement' });
    }
    
    await announcement.rsvpToEvent(vendor._id, uid, status);
    
    const updatedAnnouncement = await GroupAnnouncement.findById(announcementId);
    res.json(updatedAnnouncement.event);
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    res.status(500).json({ error: error.message || 'Failed to RSVP to event' });
  }
});

// DELETE /api/groups/:groupId/announcements/:announcementId - Delete announcement
router.delete('/:groupId/announcements/:announcementId', async (req, res) => {
  try {
    const { groupId, announcementId } = req.params;
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const announcement = await GroupAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Check permissions
    const member = group.getMember(vendor._id);
    if (!announcement.canEdit(vendor._id, member?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete announcement' });
    }
    
    // Soft delete (archive)
    announcement.isArchived = true;
    announcement.archivedAt = new Date();
    announcement.archivedBy = vendor._id;
    await announcement.save();
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Helper function to send announcement notifications
async function sendAnnouncementNotifications(announcement, recipients) {
  try {
    const group = await Group.findById(announcement.group);
    
    for (const recipient of recipients) {
      // Send WebSocket notification
      if (global.notificationWS && global.notificationWS.has(recipient.uid)) {
        const ws = global.notificationWS.get(recipient.uid);
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify({
            type: 'group_announcement',
            data: {
              id: announcement._id,
              title: announcement.title,
              content: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
              type: announcement.type,
              priority: announcement.priority,
              groupName: group.name,
              groupId: group._id,
              createdBy: announcement.createdBy.name,
              createdAt: announcement.createdAt
            }
          }));
        }
      }
      
      // Send email notification if enabled
      if (recipient.notifications?.announcements !== false) {
        const vendor = await Vendor.findById(recipient.vendor);
        if (vendor && vendor.email) {
          const emailData = {
            to: vendor.email,
            subject: `New ${announcement.type} in ${group.name}: ${announcement.title}`,
            template: 'group-announcement',
            data: {
              vendorName: vendor.businessName,
              groupName: group.name,
              announcementTitle: announcement.title,
              announcementContent: announcement.content,
              announcementType: announcement.type,
              priority: announcement.priority,
              createdBy: announcement.createdBy.name,
              groupUrl: `${process.env.FRONTEND_URL}/groups/${group._id}`,
              announcementUrl: `${process.env.FRONTEND_URL}/groups/${group._id}/announcements/${announcement._id}`
            }
          };
          
          await emailService.sendEmail(emailData);
        }
      }
    }
  } catch (error) {
    console.error('Error sending announcement notifications:', error);
  }
}

module.exports = router;
