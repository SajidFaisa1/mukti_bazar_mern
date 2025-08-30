const cron = require('node-cron');
const GroupAnnouncement = require('../models/GroupAnnouncement');
const BulkMessage = require('../models/BulkMessage');
const Group = require('../models/Group');
const Vendor = require('../models/Vendor');
const emailService = require('./emailService');

class GroupSchedulerService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Group scheduler service is already running');
      return;
    }

    console.log('🚀 Starting Group Scheduler Service...');

    // Check for scheduled announcements every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledAnnouncements();
    });

    // Check for scheduled bulk messages every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledBulkMessages();
    });

    // Clean up expired announcements daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredAnnouncements();
    });

    // Process recurring bulk messages every hour
    cron.schedule('0 * * * *', async () => {
      await this.processRecurringBulkMessages();
    });

    // Generate daily group analytics at 3 AM
    cron.schedule('0 3 * * *', async () => {
      await this.generateDailyAnalytics();
    });

    // Check for inactive members weekly on Sunday at 4 AM
    cron.schedule('0 4 * * 0', async () => {
      await this.checkInactiveMembers();
    });

    this.isRunning = true;
    console.log('✅ Group Scheduler Service started successfully');
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ Group Scheduler Service stopped');
  }

  async processScheduledAnnouncements() {
    try {
      const scheduledAnnouncements = await GroupAnnouncement.getPendingScheduled();
      
      for (const announcement of scheduledAnnouncements) {
        console.log(`📢 Processing scheduled announcement: ${announcement.title}`);
        
        // Update status to sent
        announcement.status = 'sent';
        await announcement.save();
        
        // Send notifications to recipients
        await this.sendAnnouncementNotifications(announcement);
        
        console.log(`✅ Announcement sent: ${announcement.title}`);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled announcements:', error);
    }
  }

  async processScheduledBulkMessages() {
    try {
      const scheduledMessages = await BulkMessage.getScheduledMessages();
      
      for (const message of scheduledMessages) {
        console.log(`📤 Processing scheduled bulk message: ${message.title}`);
        
        // Update status to sending
        message.delivery.status = 'sending';
        message.delivery.startedAt = new Date();
        await message.save();
        
        // Process the message
        await this.processBulkMessageDelivery(message);
        
        console.log(`✅ Bulk message processed: ${message.title}`);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled bulk messages:', error);
    }
  }

  async processRecurringBulkMessages() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const currentDate = now.getDate();
      
      // Find bulk messages with recurring schedules
      const recurringMessages = await BulkMessage.find({
        'scheduling.repeatSchedule.enabled': true,
        'delivery.status': 'sent',
        $or: [
          { 'scheduling.repeatSchedule.endDate': null },
          { 'scheduling.repeatSchedule.endDate': { $gte: now } }
        ]
      });
      
      for (const originalMessage of recurringMessages) {
        const schedule = originalMessage.scheduling.repeatSchedule;
        let shouldSend = false;
        
        // Check if it's time to send based on frequency
        if (schedule.frequency === 'daily') {
          shouldSend = true;
        } else if (schedule.frequency === 'weekly') {
          shouldSend = schedule.daysOfWeek && schedule.daysOfWeek.includes(currentDay);
        } else if (schedule.frequency === 'monthly') {
          shouldSend = schedule.dayOfMonth === currentDate;
        }
        
        if (shouldSend) {
          // Check if we haven't already sent today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const alreadySentToday = await BulkMessage.findOne({
            'campaign.id': originalMessage.campaign?.id,
            'sender.vendor': originalMessage.sender.vendor,
            createdAt: { $gte: today }
          });
          
          if (!alreadySentToday) {
            await this.createRecurringBulkMessage(originalMessage);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing recurring bulk messages:', error);
    }
  }

  async cleanupExpiredAnnouncements() {
    try {
      const now = new Date();
      
      // Find expired announcements
      const expiredAnnouncements = await GroupAnnouncement.find({
        expiresAt: { $lte: now },
        isArchived: false
      });
      
      for (const announcement of expiredAnnouncements) {
        announcement.isArchived = true;
        announcement.archivedAt = now;
        await announcement.save();
        
        console.log(`🗂️ Archived expired announcement: ${announcement.title}`);
      }
      
      console.log(`✅ Cleaned up ${expiredAnnouncements.length} expired announcements`);
    } catch (error) {
      console.error('❌ Error cleaning up expired announcements:', error);
    }
  }

  async generateDailyAnalytics() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all active groups
      const activeGroups = await Group.find({ isActive: true });
      
      for (const group of activeGroups) {
        // Calculate daily stats
        const stats = {
          date: yesterday,
          newMembers: 0,
          totalMessages: 0,
          announcements: 0,
          activeMembers: 0
        };
        
        // Count new members
        stats.newMembers = group.members.filter(m => 
          m.joinedAt >= yesterday && m.joinedAt < today
        ).length;
        
        // Count announcements
        stats.announcements = await GroupAnnouncement.countDocuments({
          group: group._id,
          createdAt: { $gte: yesterday, $lt: today }
        });
        
        // Update group analytics (you could store these in a separate analytics collection)
        group.stats.lastActivity = new Date();
        await group.save();
        
        console.log(`📊 Generated analytics for group: ${group.name}`);
      }
      
      console.log(`✅ Generated daily analytics for ${activeGroups.length} groups`);
    } catch (error) {
      console.error('❌ Error generating daily analytics:', error);
    }
  }

  async checkInactiveMembers() {
    try {
      const inactivityThreshold = new Date();
      inactivityThreshold.setDate(inactivityThreshold.getDate() - 90); // 90 days
      
      const groups = await Group.find({ isActive: true });
      
      for (const group of groups) {
        if (!group.settings.inactivityTimeoutDays) continue;
        
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - group.settings.inactivityTimeoutDays);
        
        const inactiveMembers = group.members.filter(m => 
          m.isActive && 
          !m.isBanned && 
          m.lastActivity && 
          m.lastActivity < thresholdDate
        );
        
        for (const member of inactiveMembers) {
          // Send notification about inactivity
          const vendor = await Vendor.findById(member.vendor);
          if (vendor) {
            await this.sendInactivityNotification(vendor, group);
          }
          
          console.log(`⚠️ Notified inactive member ${member.businessName} in group ${group.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking inactive members:', error);
    }
  }

  async sendAnnouncementNotifications(announcement) {
    try {
      const group = await Group.findById(announcement.group);
      const recipients = announcement.delivery.recipients;
      
      for (const recipient of recipients) {
        // Send WebSocket notification
        if (global.notificationWS && global.notificationWS.has(recipient.uid)) {
          const ws = global.notificationWS.get(recipient.uid);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({
              type: 'scheduled_announcement',
              data: {
                id: announcement._id,
                title: announcement.title,
                content: announcement.content.substring(0, 200) + '...',
                type: announcement.type,
                priority: announcement.priority,
                groupName: group.name,
                groupId: group._id,
                createdBy: announcement.createdBy.name
              }
            }));
            
            await announcement.markDelivered(recipient.vendor);
          }
        }
        
        // Send email if enabled
        const vendor = await Vendor.findById(recipient.vendor);
        if (vendor && vendor.email) {
          const emailData = {
            to: vendor.email,
            subject: `Scheduled ${announcement.type}: ${announcement.title}`,
            template: 'scheduled-announcement',
            data: {
              vendorName: vendor.businessName,
              groupName: group.name,
              announcementTitle: announcement.title,
              announcementContent: announcement.content,
              announcementType: announcement.type,
              priority: announcement.priority,
              createdBy: announcement.createdBy.name
            }
          };
          
          await emailService.sendEmail(emailData);
        }
      }
    } catch (error) {
      console.error('Error sending announcement notifications:', error);
    }
  }

  async processBulkMessageDelivery(bulkMessage) {
    try {
      const recipients = bulkMessage.delivery.recipients;
      const batchSize = bulkMessage.options.maxRecipientsPerBatch || 100;
      const delay = bulkMessage.options.delayBetweenBatches || 1000;
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process in batches
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (recipient) => {
          try {
            // Send WebSocket notification
            if (global.notificationWS && global.notificationWS.has(recipient.uid)) {
              const ws = global.notificationWS.get(recipient.uid);
              if (ws.readyState === 1) {
                ws.send(JSON.stringify({
                  type: 'scheduled_bulk_message',
                  data: {
                    id: bulkMessage._id,
                    title: bulkMessage.title,
                    content: bulkMessage.content.substring(0, 200) + '...',
                    messageType: bulkMessage.messageType,
                    priority: bulkMessage.options.priority,
                    senderName: bulkMessage.sender.name
                  }
                }));
                
                await bulkMessage.markDelivered(recipient.vendor, true);
                successCount++;
              }
            }
          } catch (error) {
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
      
      await bulkMessage.save();
      
    } catch (error) {
      console.error('Error processing bulk message delivery:', error);
      bulkMessage.delivery.status = 'failed';
      bulkMessage.delivery.completedAt = new Date();
      await bulkMessage.save();
    }
  }

  async createRecurringBulkMessage(originalMessage) {
    try {
      // Create a new bulk message based on the original
      const newMessage = new BulkMessage({
        title: originalMessage.title,
        content: originalMessage.content,
        messageType: originalMessage.messageType,
        attachments: originalMessage.attachments,
        sender: originalMessage.sender,
        targeting: originalMessage.targeting,
        scheduling: {
          sendNow: true,
          timezone: originalMessage.scheduling.timezone
        },
        options: originalMessage.options,
        campaign: originalMessage.campaign,
        delivery: { status: 'sending' }
      });
      
      await newMessage.save();
      
      // Build recipient list and process
      const recipients = await this.buildRecipientList(originalMessage.targeting, originalMessage.sender.vendor);
      
      for (const recipient of recipients) {
        await newMessage.addRecipient(recipient, 'websocket');
      }
      
      await this.processBulkMessageDelivery(newMessage);
      
      console.log(`🔄 Created recurring bulk message: ${newMessage.title}`);
    } catch (error) {
      console.error('Error creating recurring bulk message:', error);
    }
  }

  async buildRecipientList(targeting, senderVendorId) {
    // This is a simplified version - you might want to import the full function from bulkMessages.js
    const recipients = [];
    
    if (targeting.groups && targeting.groups.length > 0) {
      for (const groupId of targeting.groups) {
        const group = await Group.findById(groupId).populate('members.vendor');
        if (group) {
          const activeMembers = group.members.filter(m => m.isActive && !m.isBanned);
          recipients.push(...activeMembers.map(m => ({
            vendorId: m.vendor._id,
            uid: m.uid,
            name: m.businessName
          })));
        }
      }
    }
    
    return recipients.filter(r => r.vendorId.toString() !== senderVendorId.toString());
  }

  async sendInactivityNotification(vendor, group) {
    try {
      if (global.notificationWS && global.notificationWS.has(vendor.uid)) {
        const ws = global.notificationWS.get(vendor.uid);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: 'inactivity_warning',
            data: {
              groupName: group.name,
              groupId: group._id,
              message: `You've been inactive in ${group.name} for a while. Stay engaged!`
            }
          }));
        }
      }
      
      if (vendor.email) {
        const emailData = {
          to: vendor.email,
          subject: `Stay active in ${group.name}`,
          template: 'inactivity-reminder',
          data: {
            vendorName: vendor.businessName,
            groupName: group.name,
            groupUrl: `${process.env.FRONTEND_URL}/groups/${group._id}`
          }
        };
        
        await emailService.sendEmail(emailData);
      }
    } catch (error) {
      console.error('Error sending inactivity notification:', error);
    }
  }
}

module.exports = new GroupSchedulerService();
