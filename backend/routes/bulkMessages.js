const express = require('express');
const BulkMessage = require('../models/BulkMessage');
const Group = require('../models/Group');
const Vendor = require('../models/Vendor');
const emailService = require('../services/emailService');
const router = express.Router();

// GET /api/bulk-messages - Get bulk messages for a user
router.get('/', async (req, res) => {
  try {
    const { uid, status, messageType, limit = 20, page = 1 } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const options = { limit: parseInt(limit) };
    if (status) options.status = status;
    if (messageType) options.messageType = messageType;
    
    const skip = (page - 1) * limit;
    
    const bulkMessages = await BulkMessage.getBySender(vendor._id, options)
      .skip(skip);
    
    res.json(bulkMessages);
  } catch (error) {
    console.error('Error fetching bulk messages:', error);
    res.status(500).json({ error: 'Failed to fetch bulk messages' });
  }
});

// GET /api/bulk-messages/analytics - Get analytics for user's bulk messages
router.get('/analytics', async (req, res) => {
  try {
    const { uid, from, to } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const dateRange = {};
    if (from) dateRange.from = from;
    if (to) dateRange.to = to;
    
    const analytics = await BulkMessage.getAnalyticsSummary(vendor._id, dateRange);
    
    res.json(analytics[0] || {
      totalMessages: 0,
      totalRecipients: 0,
      totalDelivered: 0,
      totalViews: 0,
      totalClicks: 0,
      avgEngagementRate: 0,
      avgDeliveryRate: 0
    });
  } catch (error) {
    console.error('Error fetching bulk message analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST /api/bulk-messages - Create bulk message
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      messageType = 'announcement',
      attachments = [],
      targeting,
      scheduling = { sendNow: true },
      options = {},
      campaign,
      senderUid
    } = req.body;
    
    if (!title || !content || !targeting || !senderUid) {
      return res.status(400).json({ error: 'title, content, targeting, and senderUid are required' });
    }
    
    // Verify sender
    const sender = await Vendor.findOne({ uid: senderUid });
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }
    
    // Verify sender has permission for targeted groups
    if (targeting.groups && targeting.groups.length > 0) {
      for (const groupId of targeting.groups) {
        const group = await Group.findById(groupId);
        if (!group) {
          return res.status(404).json({ error: `Group ${groupId} not found` });
        }
        
        if (!group.hasPermission(sender._id, 'canSendBulkMessages')) {
          return res.status(403).json({ 
            error: `Insufficient permissions to send bulk messages to group: ${group.name}` 
          });
        }
      }
    }
    
    // Create bulk message
    const bulkMessage = new BulkMessage({
      title,
      content,
      messageType,
      attachments,
      sender: {
        vendor: sender._id,
        uid: senderUid,
        name: sender.businessName,
        role: 'vendor' // This could be enhanced to get actual role from group context
      },
      targeting,
      scheduling,
      options: {
        priority: 'normal',
        deliveryMethods: { websocket: true, email: false, sms: false },
        allowReplies: false,
        requireAcknowledgment: false,
        autoArchive: false,
        archiveAfterDays: 30,
        maxRecipientsPerBatch: 100,
        delayBetweenBatches: 1000,
        trackReads: true,
        trackClicks: true,
        ...options
      },
      campaign,
      delivery: {
        status: scheduling.sendNow ? 'sending' : 'scheduled'
      }
    });
    
    await bulkMessage.save();
    
    // Build recipient list
    const recipients = await buildRecipientList(targeting, sender._id);
    
    // Add recipients to bulk message
    for (const recipient of recipients) {
      await bulkMessage.addRecipient(recipient, 'websocket');
    }
    
    // Send immediately if not scheduled
    if (scheduling.sendNow) {
      await processBulkMessage(bulkMessage._id);
    }
    
    const populatedMessage = await BulkMessage.findById(bulkMessage._id)
      .populate('targeting.groups', 'name category stats.totalMembers')
      .populate('sender.vendor', 'businessName storeId');
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating bulk message:', error);
    res.status(500).json({ error: 'Failed to create bulk message' });
  }
});

// GET /api/bulk-messages/:messageId - Get specific bulk message
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const bulkMessage = await BulkMessage.findById(messageId)
      .populate('targeting.groups', 'name category stats.totalMembers')
      .populate('sender.vendor', 'businessName storeId');
    
    if (!bulkMessage) {
      return res.status(404).json({ error: 'Bulk message not found' });
    }
    
    // Check if user can access this message
    if (!bulkMessage.canManage(vendor._id, 'vendor')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(bulkMessage);
  } catch (error) {
    console.error('Error fetching bulk message:', error);
    res.status(500).json({ error: 'Failed to fetch bulk message' });
  }
});

// PUT /api/bulk-messages/:messageId - Update bulk message
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid, ...updateData } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const bulkMessage = await BulkMessage.findById(messageId);
    if (!bulkMessage) {
      return res.status(404).json({ error: 'Bulk message not found' });
    }
    
    // Check permissions
    if (!bulkMessage.canManage(vendor._id, 'vendor')) {
      return res.status(403).json({ error: 'Insufficient permissions to update message' });
    }
    
    // Only allow updates if message is still in draft or scheduled status
    if (!['draft', 'scheduled'].includes(bulkMessage.delivery.status)) {
      return res.status(400).json({ error: 'Cannot update message that has already been sent' });
    }
    
    // Update message
    Object.assign(bulkMessage, updateData);
    await bulkMessage.save();
    
    const updatedMessage = await BulkMessage.findById(messageId)
      .populate('targeting.groups', 'name category stats.totalMembers')
      .populate('sender.vendor', 'businessName storeId');
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating bulk message:', error);
    res.status(500).json({ error: 'Failed to update bulk message' });
  }
});

// POST /api/bulk-messages/:messageId/send - Send scheduled message now
router.post('/:messageId/send', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const bulkMessage = await BulkMessage.findById(messageId);
    if (!bulkMessage) {
      return res.status(404).json({ error: 'Bulk message not found' });
    }
    
    // Check permissions
    if (!bulkMessage.canManage(vendor._id, 'vendor')) {
      return res.status(403).json({ error: 'Insufficient permissions to send message' });
    }
    
    // Check if message can be sent
    if (!['draft', 'scheduled'].includes(bulkMessage.delivery.status)) {
      return res.status(400).json({ error: 'Message cannot be sent' });
    }
    
    // Update status and send
    bulkMessage.delivery.status = 'sending';
    bulkMessage.scheduling.sendNow = true;
    bulkMessage.scheduling.scheduledFor = null;
    await bulkMessage.save();
    
    // Process the message
    await processBulkMessage(messageId);
    
    res.json({ message: 'Bulk message sent successfully' });
  } catch (error) {
    console.error('Error sending bulk message:', error);
    res.status(500).json({ error: 'Failed to send bulk message' });
  }
});

// DELETE /api/bulk-messages/:messageId - Delete bulk message
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const bulkMessage = await BulkMessage.findById(messageId);
    if (!bulkMessage) {
      return res.status(404).json({ error: 'Bulk message not found' });
    }
    
    // Check permissions
    if (!bulkMessage.canManage(vendor._id, 'vendor')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete message' });
    }
    
    // Soft delete (archive)
    bulkMessage.isArchived = true;
    bulkMessage.archivedAt = new Date();
    bulkMessage.archivedBy = vendor._id;
    await bulkMessage.save();
    
    res.json({ message: 'Bulk message deleted successfully' });
  } catch (error) {
    console.error('Error deleting bulk message:', error);
    res.status(500).json({ error: 'Failed to delete bulk message' });
  }
});

// Helper function to build recipient list based on targeting
async function buildRecipientList(targeting, senderVendorId) {
  const recipients = new Set();
  
  try {
    // Group-based targeting
    if (targeting.groups && targeting.groups.length > 0) {
      for (const groupId of targeting.groups) {
        const group = await Group.findById(groupId).populate('members.vendor');
        if (group) {
          const activeMembers = group.members.filter(m => m.isActive && !m.isBanned);
          
          for (const member of activeMembers) {
            recipients.add(JSON.stringify({
              vendorId: member.vendor._id,
              uid: member.uid,
              name: member.businessName
            }));
          }
        }
      }
    }
    
    // Individual targeting
    if (targeting.specificVendors && targeting.specificVendors.length > 0) {
      for (const vendorId of targeting.specificVendors) {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
          recipients.add(JSON.stringify({
            vendorId: vendor._id,
            uid: vendor.uid,
            name: vendor.businessName
          }));
        }
      }
    }
    
    // Filter-based targeting
    if (targeting.filters) {
      const filterQuery = {};
      
      if (targeting.filters.categories && targeting.filters.categories.length > 0) {
        filterQuery.productCategories = { $in: targeting.filters.categories };
      }
      
      if (targeting.filters.regions && targeting.filters.regions.length > 0) {
        const regionConditions = targeting.filters.regions.map(region => {
          const condition = {};
          if (region.city) condition['address.city'] = new RegExp(region.city, 'i');
          if (region.district) condition['address.district'] = new RegExp(region.district, 'i');
          if (region.state) condition['address.state'] = new RegExp(region.state, 'i');
          return condition;
        });
        filterQuery.$or = regionConditions;
      }
      
      if (targeting.filters.businessTypes && targeting.filters.businessTypes.length > 0) {
        filterQuery.businessType = { $in: targeting.filters.businessTypes };
      }
      
      if (targeting.filters.membershipTier && targeting.filters.membershipTier.length > 0) {
        filterQuery.membershipTier = { $in: targeting.filters.membershipTier };
      }
      
      if (targeting.filters.joinDateRange) {
        filterQuery.createdAt = {};
        if (targeting.filters.joinDateRange.from) {
          filterQuery.createdAt.$gte = new Date(targeting.filters.joinDateRange.from);
        }
        if (targeting.filters.joinDateRange.to) {
          filterQuery.createdAt.$lte = new Date(targeting.filters.joinDateRange.to);
        }
      }
      
      if (Object.keys(filterQuery).length > 0) {
        const filteredVendors = await Vendor.find(filterQuery);
        for (const vendor of filteredVendors) {
          recipients.add(JSON.stringify({
            vendorId: vendor._id,
            uid: vendor.uid,
            name: vendor.businessName
          }));
        }
      }
    }
    
    // Convert Set back to array and parse JSON
    let recipientList = Array.from(recipients).map(r => JSON.parse(r));
    
    // Remove excluded vendors
    if (targeting.excludeVendors && targeting.excludeVendors.length > 0) {
      recipientList = recipientList.filter(r => 
        !targeting.excludeVendors.includes(r.vendorId.toString())
      );
    }
    
    // Remove sender from recipient list
    recipientList = recipientList.filter(r => 
      r.vendorId.toString() !== senderVendorId.toString()
    );
    
    return recipientList;
  } catch (error) {
    console.error('Error building recipient list:', error);
    return [];
  }
}

// Helper function to process bulk message delivery
async function processBulkMessage(messageId) {
  try {
    const bulkMessage = await BulkMessage.findById(messageId)
      .populate('targeting.groups', 'name')
      .populate('sender.vendor', 'businessName');
    
    if (!bulkMessage || bulkMessage.delivery.status !== 'sending') {
      return;
    }
    
    bulkMessage.delivery.startedAt = new Date();
    const batchSize = bulkMessage.options.maxRecipientsPerBatch || 100;
    const delay = bulkMessage.options.delayBetweenBatches || 1000;
    
    const recipients = bulkMessage.delivery.recipients;
    let successCount = 0;
    let failureCount = 0;
    
    // Process recipients in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (recipient) => {
        try {
          // Send WebSocket notification
          if (bulkMessage.options.deliveryMethods.websocket && 
              global.notificationWS && 
              global.notificationWS.has(recipient.uid)) {
            
            const ws = global.notificationWS.get(recipient.uid);
            if (ws.readyState === 1) { // WebSocket.OPEN
              ws.send(JSON.stringify({
                type: 'bulk_message',
                data: {
                  id: bulkMessage._id,
                  title: bulkMessage.title,
                  content: bulkMessage.content.substring(0, 200) + (bulkMessage.content.length > 200 ? '...' : ''),
                  messageType: bulkMessage.messageType,
                  priority: bulkMessage.options.priority,
                  senderName: bulkMessage.sender.name,
                  createdAt: bulkMessage.createdAt
                }
              }));
              
              await bulkMessage.markDelivered(recipient.vendor, true);
              successCount++;
            } else {
              await bulkMessage.markDelivered(recipient.vendor, false, 'WebSocket not open');
              failureCount++;
            }
          }
          
          // Send email if enabled
          if (bulkMessage.options.deliveryMethods.email) {
            const vendor = await Vendor.findById(recipient.vendor);
            if (vendor && vendor.email) {
              const emailData = {
                to: vendor.email,
                subject: `${bulkMessage.title}`,
                template: 'bulk-message',
                data: {
                  vendorName: vendor.businessName,
                  messageTitle: bulkMessage.title,
                  messageContent: bulkMessage.content,
                  messageType: bulkMessage.messageType,
                  senderName: bulkMessage.sender.name,
                  unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${vendor.uid}`
                }
              };
              
              await emailService.sendEmail(emailData);
            }
          }
          
        } catch (error) {
          console.error(`Error delivering to ${recipient.uid}:`, error);
          await bulkMessage.markDelivered(recipient.vendor, false, error.message);
          failureCount++;
        }
      }));
      
      // Delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Update final status
    bulkMessage.delivery.completedAt = new Date();
    if (failureCount === 0) {
      bulkMessage.delivery.status = 'sent';
    } else if (successCount > 0) {
      bulkMessage.delivery.status = 'partially_failed';
    } else {
      bulkMessage.delivery.status = 'failed';
    }
    
    // Record attempt
    bulkMessage.delivery.attempts.push({
      attemptedAt: new Date(),
      successful: successCount,
      failed: failureCount
    });
    
    await bulkMessage.save();
    
  } catch (error) {
    console.error('Error processing bulk message:', error);
    
    // Update status to failed
    await BulkMessage.findByIdAndUpdate(messageId, {
      'delivery.status': 'failed',
      'delivery.completedAt': new Date(),
      $push: {
        'delivery.attempts': {
          attemptedAt: new Date(),
          successful: 0,
          failed: 1,
          error: error.message
        }
      }
    });
  }
}

module.exports = router;
