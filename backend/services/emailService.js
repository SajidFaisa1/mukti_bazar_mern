const nodemailer = require('nodemailer');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

class EmailService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates for Gmail
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Mukti Bazar <noreply@muktibazar.com>',
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  async getUserEmail(uid, role) {
    try {
      const UserModel = role === 'vendor' ? Vendor : User;
      const user = await UserModel.findOne({ uid }).select('email businessName name');
      return user?.email;
    } catch (error) {
      console.error('Error fetching user email:', error);
      return null;
    }
  }

  async sendNotificationEmail(notification) {
    try {
      // Get recipient email
      const recipientEmail = await this.getUserEmail(notification.recipientUid, notification.recipientRole);
      if (!recipientEmail) {
        console.log(`No email found for user ${notification.recipientUid}`);
        return;
      }

      // Create email content based on notification type
      let subject, html;

      switch (notification.type) {
        case 'negotiation':
          subject = notification.title;
          html = this.createNegotiationNotificationTemplate(notification);
          break;
        case 'barter':
          subject = notification.title;
          html = this.createBarterNotificationTemplate(notification);
          break;
        case 'order':
          subject = notification.title;
          html = this.createOrderNotificationTemplate(notification);
          break;
        case 'payment':
          subject = notification.title;
          html = this.createPaymentNotificationTemplate(notification);
          break;
        case 'system':
          subject = notification.title;
          html = this.createSystemNotificationTemplate(notification);
          break;
        default:
          subject = notification.title;
          html = this.createGenericNotificationTemplate(notification);
      }

      await this.sendEmail(recipientEmail, subject, html);
      console.log(`Notification email sent to ${recipientEmail} for ${notification.type}`);
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }

  createNegotiationNotificationTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mukti Bazar</h1>
          <p style="color: white; margin: 5px 0;">Fresh from Farm to Table</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">${notification.title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ${notification.message}
          </p>
          
          ${notification.actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}${notification.actionUrl}" 
                 style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Negotiation
              </a>
            </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 14px;">
            This is an automated notification from Mukti Bazar. 
            <br>Visit your dashboard to manage your negotiations.
          </p>
        </div>
      </div>
    `;
  }

  createGenericNotificationTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mukti Bazar</h1>
          <p style="color: white; margin: 5px 0;">Fresh from Farm to Table</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333; margin-bottom: 20px;">${notification.title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ${notification.message}
          </p>
          
          ${notification.actionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}${notification.actionUrl}" 
                 style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 14px;">
            This is an automated notification from Mukti Bazar.
          </p>
        </div>
      </div>
    `;
  }

  createBarterNotificationTemplate(notification) {
    return this.createGenericNotificationTemplate(notification);
  }

  createOrderNotificationTemplate(notification) {
    return this.createGenericNotificationTemplate(notification);
  }

  createPaymentNotificationTemplate(notification) {
    return this.createGenericNotificationTemplate(notification);
  }

  createSystemNotificationTemplate(notification) {
    return this.createGenericNotificationTemplate(notification);
  }

  // Legacy negotiation email method for compatibility
  async sendNegotiationEmail(type, negotiation, senderUid, recipientUid, recipientRole, additionalData = {}) {
    try {
      const recipientEmail = await this.getUserEmail(recipientUid, recipientRole);
      if (!recipientEmail) {
        console.log(`No email found for user ${recipientUid}`);
        return;
      }

      let subject, html;
      
      switch (type) {
        case 'new_negotiation':
          subject = 'New Negotiation Request - Mukti Bazar';
          html = this.createNegotiationEmailTemplate('new_negotiation', negotiation, additionalData);
          break;
        case 'counter_offer':
          subject = 'New Counter Offer - Mukti Bazar';
          html = this.createNegotiationEmailTemplate('counter_offer', negotiation, additionalData);
          break;
        case 'offer_accepted':
          subject = 'Offer Accepted! - Mukti Bazar';
          html = this.createNegotiationEmailTemplate('offer_accepted', negotiation, additionalData);
          break;
        case 'offer_rejected':
          subject = 'Offer Rejected - Mukti Bazar';
          html = this.createNegotiationEmailTemplate('offer_rejected', negotiation, additionalData);
          break;
        case 'negotiation_expired':
          subject = 'Negotiation Expired - Mukti Bazar';
          html = this.createNegotiationEmailTemplate('negotiation_expired', negotiation, additionalData);
          break;
        default:
          return;
      }

      await this.sendEmail(recipientEmail, subject, html);
      console.log(`Negotiation email sent to ${recipientEmail} for ${type}`);
    } catch (error) {
      console.error('Error sending negotiation email:', error);
      throw error;
    }
  }

  createNegotiationEmailTemplate(type, negotiation, additionalData = {}) {
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mukti Bazar</h1>
          <p style="color: white; margin: 5px 0;">Fresh from Farm to Table</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
    `;

    let content = '';
    
    switch (type) {
      case 'new_negotiation':
        content = `
          <h2 style="color: #333;">New Negotiation Request</h2>
          <p>A customer wants to negotiate the price for <strong>${negotiation.productName}</strong>.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> ${negotiation.productName}</p>
            <p><strong>Original Price:</strong> ৳${negotiation.originalPrice}</p>
            <p><strong>Proposed Price:</strong> ৳${negotiation.proposedPrice}</p>
            <p><strong>Quantity:</strong> ${negotiation.quantity}</p>
            <p><strong>Total Amount:</strong> ৳${negotiation.proposedPrice * negotiation.quantity}</p>
          </div>
        `;
        break;
      case 'counter_offer':
        content = `
          <h2 style="color: #333;">New Counter Offer</h2>
          <p>A counter offer has been made for <strong>${negotiation.productName}</strong>.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> ${negotiation.productName}</p>
            <p><strong>New Offer:</strong> ৳${additionalData.price || negotiation.finalPrice}</p>
            <p><strong>Quantity:</strong> ${negotiation.quantity}</p>
          </div>
        `;
        break;
      case 'offer_accepted':
        content = `
          <h2 style="color: #4CAF50;">🎉 Offer Accepted!</h2>
          <p>Great news! Your offer for <strong>${negotiation.productName}</strong> has been accepted.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Product:</strong> ${negotiation.productName}</p>
            <p><strong>Final Price:</strong> ৳${negotiation.finalPrice}</p>
            <p><strong>Quantity:</strong> ${negotiation.finalQuantity}</p>
            <p><strong>Total Amount:</strong> ৳${negotiation.finalTotalAmount}</p>
          </div>
        `;
        break;
      case 'offer_rejected':
        content = `
          <h2 style="color: #f44336;">Offer Rejected</h2>
          <p>Unfortunately, your offer for <strong>${negotiation.productName}</strong> has been rejected.</p>
          <p>You can try making a new offer or browse other similar products.</p>
        `;
        break;
      case 'negotiation_expired':
        content = `
          <h2 style="color: #ff9800;">Negotiation Expired</h2>
          <p>The negotiation for <strong>${negotiation.productName}</strong> has expired.</p>
          <p>You can start a new negotiation if the product is still available.</p>
        `;
        break;
    }

    const actionButton = type !== 'negotiation_expired' ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/negotiations?id=${negotiation._id}" 
           style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Negotiation
        </a>
      </div>
    ` : '';

    return baseTemplate + content + actionButton + `
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 14px;">
            This is an automated email from Mukti Bazar. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
  }
}

module.exports = new EmailService();
