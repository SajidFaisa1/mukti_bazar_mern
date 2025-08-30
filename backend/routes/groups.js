const express = require('express');
const Group = require('../models/Group');
const GroupInvitation = require('../models/GroupInvitation');
const Conversation = require('../models/Conversation');
const Vendor = require('../models/Vendor');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// GET /api/groups - Get groups for a vendor
router.get('/', async (req, res) => {
  try {
    const { uid, category, city, district } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const options = {};
    if (category) options.category = category;
    if (city || district) {
      options.region = {};
      if (city) options.region.city = city;
      if (district) options.region.district = district;
    }
    
    const groups = await Group.findByVendor(vendor._id, options)
      .populate('members.vendor', 'businessName storeId')
      .populate('conversation', 'lastMessage messageCount')
      .lean();
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/groups/discover - Discover public groups
router.get('/discover', async (req, res) => {
  try {
    const { search, category, city, district, limit = 20 } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (city || district) {
      filters.region = {};
      if (city) filters.region.city = city;
      if (district) filters.region.district = district;
    }
    
    const groups = await Group.searchGroups(search, filters)
      .populate('createdBy', 'businessName storeId')
      .limit(parseInt(limit))
      .lean();
    
    res.json(groups);
  } catch (error) {
    console.error('Error discovering groups:', error);
    res.status(500).json({ error: 'Failed to discover groups' });
  }
});

// GET /api/groups/invitations - Get pending invitations for a user
router.get('/invitations', async (req, res) => {
  try {
    const { uid } = req.query;
    
    console.log('Fetching invitations for uid:', uid);
    
    if (!uid) {
      console.log('Missing uid parameter');
      return res.status(400).json({ error: 'uid is required' });
    }
    
    console.log('Cleaning expired invitations...');
    // Clean up expired invitations first
    await GroupInvitation.cleanExpired();
    
    console.log('Finding invitations...');
    const invitations = await GroupInvitation.find({
      inviteeUid: uid,
      status: 'pending'
    })
    .populate('group', 'name description category avatar')
    .populate('inviter', 'businessName storeId')
    .sort({ createdAt: -1 });
    
    console.log('Found invitations:', invitations.length);
    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// POST /api/groups/invitations/:invitationId/accept - Accept a group invitation
router.post('/invitations/:invitationId/accept', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const invitation = await GroupInvitation.findById(invitationId)
      .populate('group')
      .populate('invitee');
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    if (invitation.inviteeUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to accept this invitation' });
    }
    
    // Accept the invitation
    await invitation.accept();
    
    // Add member to group
    await invitation.group.addMember({
      vendorId: invitation.invitee._id,
      uid: invitation.invitee.uid,
      businessName: invitation.invitee.businessName,
      storeId: invitation.invitee.storeId
    });
    
    // Add to the associated conversation
    if (invitation.group.conversation) {
      const conversation = await Conversation.findById(invitation.group.conversation);
      if (conversation) {
        const existingParticipant = conversation.participants.find(p => p.uid === uid);
        if (!existingParticipant) {
          conversation.participants.push({
            user: invitation.invitee._id,
            userModel: 'Vendor',
            uid: invitation.invitee.uid,
            name: invitation.invitee.businessName,
            role: 'vendor',
            isAdmin: false
          });
          await conversation.save();
        }
      }
    }
    
    res.json({ success: true, message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
});

// POST /api/groups/invitations/:invitationId/reject - Reject a group invitation
router.post('/invitations/:invitationId/reject', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const invitation = await GroupInvitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    if (invitation.inviteeUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to reject this invitation' });
    }
    
    // Reject the invitation
    await invitation.reject();
    
    res.json({ success: true, message: 'Invitation rejected successfully' });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ error: error.message || 'Failed to reject invitation' });
  }
});

// GET /api/groups/:groupId - Get group details
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const group = await Group.findById(groupId)
      .populate('members.vendor', 'businessName storeId email')
      .populate('createdBy', 'businessName storeId')
      .populate('conversation', 'lastMessage messageCount')
      .lean();
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is member (for privacy)
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const isMember = group.members.some(m => 
      m.vendor._id.toString() === vendor._id.toString() && m.isActive
    );
    
    // If group is private and user is not a member, limit info
    if (group.settings.isPrivate && !isMember) {
      return res.json({
        _id: group._id,
        name: group.name,
        description: group.description,
        category: group.category,
        stats: {
          totalMembers: group.stats.totalMembers
        },
        settings: {
          isPrivate: true,
          requiresApproval: group.settings.requiresApproval
        }
      });
    }
    
    res.json({
      ...group,
      userIsMember: isMember,
      userRole: isMember ? group.members.find(m => 
        m.vendor._id.toString() === vendor._id.toString()
      )?.role : null
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /api/groups - Create a new group
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category = 'general',
      tags = [],
      settings = {},
      region = {},
      productCategories = [],
      creatorUid
    } = req.body;
    
    if (!name || !creatorUid) {
      return res.status(400).json({ error: 'name and creatorUid are required' });
    }
    
    const creator = await Vendor.findOne({ uid: creatorUid });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    
    // Check if group name already exists in same region/category
    const existingGroup = await Group.findOne({
      name: new RegExp(`^${name}$`, 'i'),
      category,
      ...(region.city && { 'region.city': region.city })
    });
    
    if (existingGroup) {
      return res.status(400).json({ error: 'Group with this name already exists in this category/region' });
    }
    
    // Create group
    const groupData = {
      name,
      description,
      category,
      tags,
      settings: {
        isPrivate: false,
        requiresApproval: false,
        allowMemberInvites: true,
        maxMembers: 50,
        allowFileSharing: true,
        allowImageSharing: true,
        ...settings
      },
      region,
      productCategories,
      createdBy: creator._id,
      creatorUid
    };
    
    const group = new Group(groupData);
    await group.save();
    
    // Add creator as admin member
    await group.addMember({
      vendorId: creator._id,
      uid: creator.uid,
      businessName: creator.businessName,
      storeId: creator.storeId
    }, 'admin');
    
    // Create associated conversation
    const conversationData = {
      type: 'group',
      title: name,
      description,
      participants: [{
        user: creator._id,
        userModel: 'Vendor',
        uid: creator.uid,
        name: creator.businessName,
        role: 'vendor',
        isAdmin: true
      }],
      createdBy: creator._id,
      createdByModel: 'Vendor'
    };
    
    const conversation = new Conversation(conversationData);
    await conversation.save();
    
    // Link conversation to group and group to conversation
    group.conversation = conversation._id;
    conversation.groupId = group._id;
    await group.save();
    await conversation.save();
    
    await group.populate('members.vendor', 'businessName storeId');
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// POST /api/groups/:groupId/join - Join a group
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.body;
    
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
    
    // Check if already a member
    if (group.isMember(vendor._id)) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }
    
    // For private groups or groups requiring approval, handle differently
    if (group.settings.isPrivate || group.settings.requiresApproval) {
      // TODO: Implement approval system
      return res.status(400).json({ error: 'This group requires approval to join' });
    }
    
    // Add member to group
    await group.addMember({
      vendorId: vendor._id,
      uid: vendor.uid,
      businessName: vendor.businessName,
      storeId: vendor.storeId
    });
    
    // Also add to the associated conversation
    if (group.conversation) {
      const conversation = await Conversation.findById(group.conversation);
      if (conversation) {
        // Check if already a participant
        const existingParticipant = conversation.participants.find(p => p.uid === uid);
        if (!existingParticipant) {
          conversation.participants.push({
            user: vendor._id,
            userModel: 'Vendor',
            uid: vendor.uid,
            name: vendor.businessName,
            role: 'vendor',
            isAdmin: false
          });
          await conversation.save();
        }
      }
    }
    
    res.json({ success: true, message: 'Successfully joined group' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: error.message || 'Failed to join group' });
  }
});

// POST /api/groups/:groupId/leave - Leave a group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.body;
    
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
    
    // Check if member
    if (!group.isMember(vendor._id)) {
      return res.status(400).json({ error: 'Not a member of this group' });
    }
    
    // Check if only admin - get all active admin members
    const adminMembers = group.members.filter(m => 
      m.isActive && m.role === 'admin'
    );
    if (adminMembers.length === 1 && group.isAdmin(vendor._id)) {
      return res.status(400).json({ 
        error: 'Cannot leave group as the only admin. Transfer admin rights first.' 
      });
    }
    
    // Remove member from group
    await group.removeMember(vendor._id);
    
    // Also remove from the associated conversation
    if (group.conversation) {
      const conversation = await Conversation.findById(group.conversation);
      if (conversation) {
        // Remove participant from conversation
        conversation.participants = conversation.participants.filter(p => 
          p.uid !== uid
        );
        await conversation.save();
      }
    }
    
    res.json({ success: true, message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// POST /api/groups/:groupId/invite - Invite vendor to group
router.post('/:groupId/invite', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { inviterUid, inviteeUid } = req.body;
    
    console.log('Invite request:', { groupId, inviterUid, inviteeUid });
    
    if (!inviterUid || !inviteeUid) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'inviterUid and inviteeUid are required' });
    }
    
    const [inviter, invitee] = await Promise.all([
      Vendor.findOne({ uid: inviterUid }),
      Vendor.findOne({ uid: inviteeUid })
    ]);
    
    console.log('Found vendors:', { 
      inviter: inviter ? inviter.businessName : 'null', 
      invitee: invitee ? invitee.businessName : 'null' 
    });
    
    if (!inviter || !invitee) {
      console.log('Vendor not found');
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      console.log('Group not found');
      return res.status(404).json({ error: 'Group not found' });
    }
    
    console.log('Group found:', group.name);
    
    // Check if inviter has permission
    const inviterMember = group.getMember(inviter._id);
    console.log('Inviter member:', inviterMember ? 'found' : 'not found');
    if (inviterMember) {
      console.log('Inviter permissions:', inviterMember.permissions);
    }
    
    if (!inviterMember || !inviterMember.permissions.canInviteMembers) {
      console.log('No permission to invite members');
      return res.status(403).json({ error: 'No permission to invite members' });
    }
    
    // Check if invitee is already a member
    const isAlreadyMember = group.isMember(invitee._id);
    console.log('Is invitee already a member:', isAlreadyMember);
    if (isAlreadyMember) {
      console.log('User is already a member');
      return res.status(400).json({ error: 'User is already a member' });
    }
    
    // Check if there's already a pending invitation
    const existingInvitation = await GroupInvitation.findOne({
      group: groupId,
      inviteeUid: inviteeUid,
      status: 'pending'
    });
    
    console.log('Existing invitation:', existingInvitation ? 'found' : 'not found');
    
    if (existingInvitation) {
      console.log('User already has pending invitation');
      return res.status(400).json({ error: 'User already has a pending invitation to this group' });
    }
    
    // Create invitation instead of directly adding member
    const invitation = new GroupInvitation({
      group: groupId,
      inviter: inviter._id,
      invitee: invitee._id,
      inviterUid: inviterUid,
      inviteeUid: inviteeUid,
      message: req.body.message || `You've been invited to join the group "${group.name}"`
    });
    
    await invitation.save();
    
    // Populate invitation with group and inviter info for response
    await invitation.populate([
      { path: 'group', select: 'name description category' },
      { path: 'inviter', select: 'businessName storeId' }
    ]);
    
    res.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      invitation: invitation
    });
  } catch (error) {
    console.error('Error inviting vendor:', error);
    res.status(500).json({ error: error.message || 'Failed to invite vendor' });
  }
});

// PUT /api/groups/:groupId - Update group settings
router.put('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid, updates } = req.body;
    
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
    
    // Check if user is admin
    if (!group.isAdmin(vendor._id)) {
      return res.status(403).json({ error: 'Only admins can update group settings' });
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'settings', 'tags', 'region', 'productCategories'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'settings') {
          group.settings = { ...group.settings, ...updates.settings };
        } else {
          group[key] = updates[key];
        }
      }
    });
    
    await group.save();
    
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// PUT /api/groups/:groupId/members/:vendorId/role - Update member role
router.put('/:groupId/members/:vendorId/role', async (req, res) => {
  try {
    const { groupId, vendorId } = req.params;
    const { uid, newRole } = req.body;
    
    if (!uid || !newRole) {
      return res.status(400).json({ error: 'uid and newRole are required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!group.isAdmin(vendor._id)) {
      return res.status(403).json({ error: 'Only admins can update member roles' });
    }
    
    // Update member role
    await group.updateMemberRole(vendorId, newRole);
    
    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: error.message || 'Failed to update member role' });
  }
});

// DELETE /api/groups/:groupId - Delete group
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid } = req.body;
    
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
    
    // Check if user has permission to delete group
    if (!group.hasPermission(vendor._id, 'canDeleteGroup')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete group' });
    }
    
    // Deactivate group instead of deleting
    group.isActive = false;
    await group.save();
    
    // Also deactivate associated conversation
    if (group.conversation) {
      await Conversation.findByIdAndUpdate(group.conversation, { isActive: false });
    }
    
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// PUT /api/groups/:groupId/members/:memberId/role - Update member role
router.put('/:groupId/members/:memberId/role', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { uid, newRole } = req.body;
    
    if (!uid || !newRole) {
      return res.status(400).json({ error: 'uid and newRole are required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check permissions
    if (!group.hasPermission(vendor._id, 'canPromoteMembers') && !group.hasPermission(vendor._id, 'canDemoteMembers')) {
      return res.status(403).json({ error: 'Insufficient permissions to change member role' });
    }
    
    await group.updateMemberRole(memberId, newRole, vendor._id);
    
    const updatedGroup = await Group.findById(groupId)
      .populate('members.vendor', 'businessName storeId');
    
    res.json({ 
      success: true, 
      message: 'Member role updated successfully',
      group: updatedGroup 
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: error.message || 'Failed to update member role' });
  }
});

// POST /api/groups/:groupId/members/:memberId/ban - Ban member
router.post('/:groupId/members/:memberId/ban', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { uid, reason, durationDays } = req.body;
    
    if (!uid || !reason) {
      return res.status(400).json({ error: 'uid and reason are required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check permissions
    if (!group.hasPermission(vendor._id, 'canBanMembers')) {
      return res.status(403).json({ error: 'Insufficient permissions to ban members' });
    }
    
    await group.banMember(memberId, vendor._id, reason, durationDays);
    
    res.json({ 
      success: true, 
      message: 'Member banned successfully' 
    });
  } catch (error) {
    console.error('Error banning member:', error);
    res.status(500).json({ error: error.message || 'Failed to ban member' });
  }
});

// POST /api/groups/:groupId/members/:memberId/unban - Unban member
router.post('/:groupId/members/:memberId/unban', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { uid } = req.body;
    
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
    
    // Check permissions
    if (!group.hasPermission(vendor._id, 'canBanMembers')) {
      return res.status(403).json({ error: 'Insufficient permissions to unban members' });
    }
    
    await group.unbanMember(memberId, vendor._id);
    
    res.json({ 
      success: true, 
      message: 'Member unbanned successfully' 
    });
  } catch (error) {
    console.error('Error unbanning member:', error);
    res.status(500).json({ error: error.message || 'Failed to unban member' });
  }
});

// GET /api/groups/:groupId/analytics - Get group analytics
router.get('/:groupId/analytics', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid, period = '30d' } = req.query;
    
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
    
    // Check permissions
    if (!group.hasPermission(vendor._id, 'canViewAnalytics')) {
      return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
    }
    
    // Calculate date range
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[period] || 30;
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    // Get analytics data
    const analytics = {
      memberGrowth: await getMemberGrowthData(groupId, startDate),
      activityStats: await getGroupActivityStats(groupId, startDate),
      membersByRole: await getMembersByRole(groupId),
      recentActivity: await getRecentGroupActivity(groupId, 10)
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching group analytics:', error);
    res.status(500).json({ error: 'Failed to fetch group analytics' });
  }
});

// GET /api/groups/:groupId/members - Get group members with enhanced info
router.get('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid, role, status = 'active' } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId)
      .populate('members.vendor', 'businessName storeId email phoneNumber address');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user can view member list
    if (!group.hasPermission(vendor._id, 'canViewMemberList')) {
      return res.status(403).json({ error: 'Insufficient permissions to view member list' });
    }
    
    let members = group.members;
    
    // Filter by role if specified
    if (role) {
      members = members.filter(m => m.role === role);
    }
    
    // Filter by status
    if (status === 'active') {
      members = members.filter(m => m.isActive && !m.isBanned);
    } else if (status === 'banned') {
      members = members.filter(m => m.isBanned);
    } else if (status === 'inactive') {
      members = members.filter(m => !m.isActive);
    }
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// PUT /api/groups/:groupId/settings - Update group settings
router.put('/:groupId/settings', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { uid, settings } = req.body;
    
    if (!uid || !settings) {
      return res.status(400).json({ error: 'uid and settings are required' });
    }
    
    const vendor = await Vendor.findOne({ uid });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check permissions
    if (!group.hasPermission(vendor._id, 'canManageSettings')) {
      return res.status(403).json({ error: 'Insufficient permissions to manage group settings' });
    }
    
    // Update settings
    Object.assign(group.settings, settings);
    await group.save();
    
    res.json({ 
      success: true, 
      message: 'Group settings updated successfully',
      settings: group.settings 
    });
  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json({ error: 'Failed to update group settings' });
  }
});

// Helper functions for analytics
async function getMemberGrowthData(groupId, startDate) {
  const group = await Group.findById(groupId);
  if (!group) return [];
  
  const memberJoinDates = group.members
    .filter(m => m.joinedAt >= startDate)
    .map(m => m.joinedAt)
    .sort((a, b) => a - b);
  
  // Group by day
  const growthData = {};
  memberJoinDates.forEach(date => {
    const day = date.toISOString().split('T')[0];
    growthData[day] = (growthData[day] || 0) + 1;
  });
  
  return Object.entries(growthData).map(([date, count]) => ({
    date,
    newMembers: count
  }));
}

async function getGroupActivityStats(groupId, startDate) {
  // This would integrate with message/conversation data
  // For now, return basic stats
  return {
    totalMessages: 0,
    totalAnnouncements: 0,
    averageMessagesPerDay: 0,
    mostActiveMembers: []
  };
}

async function getMembersByRole(groupId) {
  const group = await Group.findById(groupId);
  if (!group) return {};
  
  const roleCount = {};
  group.members.filter(m => m.isActive && !m.isBanned).forEach(member => {
    roleCount[member.role] = (roleCount[member.role] || 0) + 1;
  });
  
  return roleCount;
}

async function getRecentGroupActivity(groupId, limit) {
  // This would fetch recent activities like joins, leaves, role changes, etc.
  // For now, return empty array
  return [];
}

// PATCH /api/groups/fix-conversations - Fix existing group conversations (one-time migration)
router.patch('/fix-conversations', async (req, res) => {
  try {
    // Find all groups with conversations that don't have groupId set
    const groups = await Group.find({ conversation: { $exists: true } }).populate('conversation');
    
    let updated = 0;
    for (const group of groups) {
      if (group.conversation && !group.conversation.groupId) {
        await Conversation.findByIdAndUpdate(group.conversation._id, { groupId: group._id });
        updated++;
      }
    }
    
    res.json({ message: `Updated ${updated} group conversations` });
  } catch (error) {
    console.error('Error fixing conversations:', error);
    res.status(500).json({ error: 'Failed to fix conversations' });
  }
});

module.exports = router;
