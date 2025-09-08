const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Get all admins
router.get('/admins', protect, adminOnly, async (req, res) => {
  try {
    const admins = await Admin.find({ 
      status: { $ne: 'archived' } // Exclude archived admins
    })
      .select('-password')
      .sort({ createdAt: -1 });

    // Enrich with activity data
    const enrichedAdmins = await Promise.all(admins.map(async (admin) => {
      const lastActivity = await AuditEvent.findOne({
        userId: admin._id
      }).sort({ createdAt: -1 });

      return {
        ...admin.toObject(),
        lastLoginAt: lastActivity?.createdAt,
        activityCount: await AuditEvent.countDocuments({ userId: admin._id })
      };
    }));

    res.json({
      admins: enrichedAdmins
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Get archived admins
router.get('/admins/archived', protect, adminOnly, async (req, res) => {
  try {
    const archivedAdmins = await Admin.find({ 
      status: 'archived' 
    })
      .select('-password')
      .populate('archivedBy', 'name email')
      .sort({ archivedAt: -1 });

    res.json({
      archivedAdmins: archivedAdmins
    });
  } catch (error) {
    console.error('Error fetching archived admins:', error);
    res.status(500).json({ error: 'Failed to fetch archived admins' });
  }
});

// Get all users for admin promotion (not just eligible/verified ones)
router.get('/eligible-users', protect, adminOnly, async (req, res) => {
  try {
    // Get users who are not already admins
    const adminEmails = await Admin.distinct('email');
    
    const allUsers = await User.find({
      email: { $nin: adminEmails },
      banned: { $ne: true }
      // Removed verification requirement - admins can promote any user
    })
    .select('firstName lastName email createdAt verification')
    .sort({ createdAt: -1 })
    .limit(200); // Increased limit since we're showing all users

    res.json({
      users: allUsers.map(user => ({
        ...user.toObject(),
        verified: user.verification?.status === 'verified'
      }))
    });
  } catch (error) {
    console.error('Error fetching users for promotion:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Promote user to admin
router.post('/promote', protect, adminOnly, async (req, res) => {
  try {
    const { userId, role = 'admin', permissions = [] } = req.body;

    // Check if current user has permission to promote
    const currentAdmin = await Admin.findById(req.user.id);
    if (!currentAdmin || (currentAdmin.role !== 'super_admin' && role === 'super_admin')) {
      return res.status(403).json({ 
        error: 'Only Super Admins can promote users to Super Admin role' 
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already an admin
    const existingAdmin = await Admin.findOne({ email: user.email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    // Create admin account
    const tempPassword = Math.random().toString(36).slice(-8); // Generate temp password
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newAdmin = new Admin({
      email: user.email,
      password: hashedPassword,
      role: role,
      permissions: permissions,
      name: `${user.firstName} ${user.lastName}`,
      promotedBy: req.user.id,
      promotedAt: new Date(),
      mustChangePassword: true,
      originalUserId: userId // Store reference to original user
    });

    await newAdmin.save();

    // Remove user from users collection since they're now an admin
    await User.findByIdAndDelete(userId);

    // Log the promotion
    await AuditEvent.create({
      type: 'user_promoted_to_admin',
      userId: req.user.id,
      description: `Promoted ${user.firstName} ${user.lastName} to ${role}`,
      meta: {
        promotedUserId: userId,
        newAdminId: newAdmin._id,
        role: role,
        permissions: permissions
      }
    });

    // TODO: Send email to user with temporary password and instructions
    // For now, we'll return the temp password (in production, this should be emailed)

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
        tempPassword: tempPassword // Remove this in production
      }
    });

  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Demote admin (remove admin privileges)
router.post('/demote/:adminId', protect, adminOnly, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if current user has permission
    const currentAdmin = await Admin.findById(req.user.id);
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Only Super Admins can remove admin privileges' 
      });
    }

    // Prevent self-demotion
    if (adminId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const adminToRemove = await Admin.findById(adminId);
    if (!adminToRemove) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent removing the last super admin
    if (adminToRemove.role === 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ 
          error: 'Cannot remove the last Super Admin' 
        });
      }
    }

    // Archive the admin instead of deleting (safer approach)
    adminToRemove.status = 'archived';
    adminToRemove.archivedBy = req.user.id;
    adminToRemove.archivedAt = new Date();
    await adminToRemove.save();

    // Log the archival
    await AuditEvent.create({
      type: 'admin_archived',
      userId: req.user.id,
      description: `Archived admin privileges for ${adminToRemove.name || adminToRemove.email}`,
      meta: {
        archivedAdminId: adminId,
        previousRole: adminToRemove.role,
        adminEmail: adminToRemove.email
      }
    });

    res.json({
      success: true,
      message: 'Admin archived successfully'
    });

  } catch (error) {
    console.error('Error archiving admin:', error);
    res.status(500).json({ error: 'Failed to archive admin' });
  }
});

// Unarchive admin (restore admin privileges)
router.post('/unarchive/:adminId', protect, adminOnly, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if current user has permission
    const currentAdmin = await Admin.findById(req.user.id);
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Only Super Admins can restore admin privileges' 
      });
    }

    const adminToRestore = await Admin.findById(adminId);
    if (!adminToRestore) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (adminToRestore.status !== 'archived') {
      return res.status(400).json({ error: 'Admin is not archived' });
    }

    // Restore the admin
    adminToRestore.status = 'active';
    adminToRestore.archivedBy = undefined;
    adminToRestore.archivedAt = undefined;
    await adminToRestore.save();

    // Log the restoration
    await AuditEvent.create({
      type: 'admin_unarchived',
      userId: req.user.id,
      description: `Restored admin privileges for ${adminToRestore.name || adminToRestore.email}`,
      meta: {
        restoredAdminId: adminId,
        role: adminToRestore.role,
        adminEmail: adminToRestore.email
      }
    });

    res.json({
      success: true,
      message: 'Admin privileges restored successfully'
    });

  } catch (error) {
    console.error('Error restoring admin:', error);
    res.status(500).json({ error: 'Failed to restore admin privileges' });
  }
});

// Toggle admin status (enable/disable)
router.patch('/toggle/:adminId', protect, adminOnly, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { enabled } = req.body;

    // Check permissions
    const currentAdmin = await Admin.findById(req.user.id);
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Only Super Admins can enable/disable admin accounts' 
      });
    }

    // Prevent self-disable
    if (adminId === req.user.id && !enabled) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent disabling the last super admin
    if (!enabled && admin.role === 'super_admin') {
      const activeSuperAdminCount = await Admin.countDocuments({ 
        role: 'super_admin', 
        enabled: { $ne: false } 
      });
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ 
          error: 'Cannot disable the last active Super Admin' 
        });
      }
    }

    admin.enabled = enabled;
    admin.lastModifiedBy = req.user.id;
    await admin.save();

    // Log the action
    await AuditEvent.create({
      type: 'admin_status_changed',
      userId: req.user.id,
      description: `${enabled ? 'Enabled' : 'Disabled'} admin account: ${admin.name || admin.email}`,
      meta: {
        targetAdminId: adminId,
        enabled: enabled
      }
    });

    res.json({
      success: true,
      message: `Admin account ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

// Update admin role and permissions
router.patch('/update-role/:adminId', protect, adminOnly, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { role, permissions } = req.body;

    // Check permissions
    const currentAdmin = await Admin.findById(req.user.id);
    if (!currentAdmin || currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Only Super Admins can modify admin roles' 
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const previousRole = admin.role;
    admin.role = role;
    admin.permissions = permissions;
    admin.lastModifiedBy = req.user.id;
    await admin.save();

    // Log the change
    await AuditEvent.create({
      type: 'admin_role_updated',
      userId: req.user.id,
      description: `Updated admin role from ${previousRole} to ${role}`,
      meta: {
        targetAdminId: adminId,
        previousRole: previousRole,
        newRole: role,
        permissions: permissions
      }
    });

    res.json({
      success: true,
      message: 'Admin role updated successfully',
      admin: {
        id: admin._id,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Error updating admin role:', error);
    res.status(500).json({ error: 'Failed to update admin role' });
  }
});

// Get admin activity log
router.get('/activity/:adminId', protect, adminOnly, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { limit = 50 } = req.query;

    const activities = await AuditEvent.find({
      $or: [
        { userId: adminId },
        { 'meta.targetAdminId': adminId },
        { 'meta.promotedUserId': adminId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      activities: activities.map(activity => ({
        id: activity._id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.createdAt,
        meta: activity.meta
      }))
    });

  } catch (error) {
    console.error('Error fetching admin activity:', error);
    res.status(500).json({ error: 'Failed to fetch admin activity' });
  }
});

// Admin statistics
router.get('/statistics', protect, adminOnly, async (req, res) => {
  try {
    const stats = {
      totalAdmins: await Admin.countDocuments({ status: { $ne: 'archived' } }),
      activeAdmins: await Admin.countDocuments({ 
        status: { $ne: 'archived' }, 
        enabled: { $ne: false } 
      }),
      roleDistribution: await Admin.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      recentPromotions: await AuditEvent.countDocuments({
        type: 'user_promoted_to_admin',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      recentActivity: await AuditEvent.countDocuments({
        type: { $in: ['admin_login', 'admin_action', 'rule_triggered'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

module.exports = router;
