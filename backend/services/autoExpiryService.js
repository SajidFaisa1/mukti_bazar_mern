const cron = require('node-cron');
const Negotiation = require('../models/Negotiation');
const Notification = require('../models/Notification');
const emailService = require('./emailService');

class AutoExpiryService {
  constructor() {
    this.isRunning = false;
  }

  // Start the auto-expiry cron jobs
  start() {
    if (this.isRunning) {
      console.log('Auto-expiry service is already running');
      return;
    }

    console.log('Starting auto-expiry service...');

    // Run every hour to check for expired negotiations
    this.expiryJob = cron.schedule('0 * * * *', async () => {
      await this.expireNegotiations();
    }, {
      scheduled: false
    });

    // Run every 6 hours to send expiry warnings (24 hours before expiry)
    this.warningJob = cron.schedule('0 */6 * * *', async () => {
      await this.sendExpiryWarnings();
    }, {
      scheduled: false
    });

    // Run daily to clean up old notifications (older than 30 days)
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldNotifications();
    }, {
      scheduled: false
    });

    // Start all jobs
    this.expiryJob.start();
    this.warningJob.start();
    this.cleanupJob.start();

    this.isRunning = true;
    console.log('Auto-expiry service started successfully');
  }

  // Stop the auto-expiry service
  stop() {
    if (!this.isRunning) {
      console.log('Auto-expiry service is not running');
      return;
    }

    if (this.expiryJob) this.expiryJob.stop();
    if (this.warningJob) this.warningJob.stop();
    if (this.cleanupJob) this.cleanupJob.stop();

    this.isRunning = false;
    console.log('Auto-expiry service stopped');
  }

  // Find and expire negotiations that have passed their expiry date
  async expireNegotiations() {
    try {
      console.log('Checking for expired negotiations...');

      const expiredNegotiations = await Negotiation.find({
        status: 'active',
        expiresAt: { $lte: new Date() },
        isActive: true
      }).populate('productId', 'name')
        .populate('buyer', 'name email businessName')
        .populate('seller', 'businessName email');

      if (expiredNegotiations.length === 0) {
        console.log('No expired negotiations found');
        return;
      }

      console.log(`Found ${expiredNegotiations.length} expired negotiations`);

      for (const negotiation of expiredNegotiations) {
        try {
          // Update negotiation status
          await Negotiation.findByIdAndUpdate(negotiation._id, {
            status: 'expired',
            updatedAt: new Date()
          });

          // Send notifications to both participants
          await Notification.createNegotiationNotification(
            'negotiation_expired',
            negotiation,
            null // No specific sender for expiry
          );

          // Send email notifications
          if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
            await emailService.sendNegotiationEmail(
              'negotiation_expired',
              negotiation,
              null,
              negotiation.buyerUid,
              negotiation.buyerRole
            );
            await emailService.sendNegotiationEmail(
              'negotiation_expired',
              negotiation,
              null,
              negotiation.sellerUid,
              negotiation.sellerRole
            );
          }

          console.log(`Expired negotiation ${negotiation._id} for product ${negotiation.productName}`);
        } catch (error) {
          console.error(`Error expiring negotiation ${negotiation._id}:`, error);
        }
      }

      console.log(`Successfully expired ${expiredNegotiations.length} negotiations`);
    } catch (error) {
      console.error('Error in expireNegotiations:', error);
    }
  }

  // Send warning notifications for negotiations expiring within 24 hours
  async sendExpiryWarnings() {
    try {
      console.log('Checking for negotiations expiring soon...');

      const now = new Date();
      const warningTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      const soonToExpireNegotiations = await Negotiation.find({
        status: 'active',
        expiresAt: { 
          $gt: now,
          $lte: warningTime 
        },
        isActive: true,
        // Avoid sending multiple warnings - check if warning was already sent
        $or: [
          { expiryWarningSent: { $exists: false } },
          { expiryWarningSent: false }
        ]
      }).populate('productId', 'name')
        .populate('buyer', 'name email businessName')
        .populate('seller', 'businessName email');

      if (soonToExpireNegotiations.length === 0) {
        console.log('No negotiations expiring soon');
        return;
      }

      console.log(`Found ${soonToExpireNegotiations.length} negotiations expiring within 24 hours`);

      for (const negotiation of soonToExpireNegotiations) {
        try {
          // Create warning notifications
          await Notification.createNotification({
            recipientUid: negotiation.buyerUid,
            recipientRole: negotiation.buyerRole,
            type: 'negotiation',
            title: 'Negotiation Expiring Soon ⏰',
            message: `Your negotiation for ${negotiation.productName} expires in less than 24 hours`,
            relatedId: negotiation._id,
            relatedType: 'Negotiation',
            actionUrl: `/negotiations?id=${negotiation._id}`,
            priority: 'high'
          });

          await Notification.createNotification({
            recipientUid: negotiation.sellerUid,
            recipientRole: negotiation.sellerRole,
            type: 'negotiation',
            title: 'Negotiation Expiring Soon ⏰',
            message: `The negotiation for ${negotiation.productName} expires in less than 24 hours`,
            relatedId: negotiation._id,
            relatedType: 'Negotiation',
            actionUrl: `/negotiations?id=${negotiation._id}`,
            priority: 'high'
          });

          // Mark warning as sent
          await Negotiation.findByIdAndUpdate(negotiation._id, {
            expiryWarningSent: true
          });

          console.log(`Sent expiry warning for negotiation ${negotiation._id}`);
        } catch (error) {
          console.error(`Error sending expiry warning for negotiation ${negotiation._id}:`, error);
        }
      }

      console.log(`Successfully sent expiry warnings for ${soonToExpireNegotiations.length} negotiations`);
    } catch (error) {
      console.error('Error in sendExpiryWarnings:', error);
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      console.log('Cleaning up old notifications...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  // Manual trigger methods for testing
  async manualExpiry() {
    console.log('Manual expiry triggered');
    await this.expireNegotiations();
  }

  async manualWarning() {
    console.log('Manual warning triggered');
    await this.sendExpiryWarnings();
  }

  async manualCleanup() {
    console.log('Manual cleanup triggered');
    await this.cleanupOldNotifications();
  }

  // Get service status
  getStatus() {
    return {
      running: this.isRunning,
      jobs: {
        expiry: this.expiryJob ? this.expiryJob.getStatus() : null,
        warning: this.warningJob ? this.warningJob.getStatus() : null,
        cleanup: this.cleanupJob ? this.cleanupJob.getStatus() : null
      }
    };
  }
}

module.exports = new AutoExpiryService();
