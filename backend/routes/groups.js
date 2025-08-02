const express = require('express');
const Group = require('../models/Group');
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
    
    // Link conversation to group
    group.conversation = conversation._id;
    await group.save();
    
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
    
    // Add member
    await group.addMember({
      vendorId: vendor._id,
      uid: vendor.uid,
      businessName: vendor.businessName,
      storeId: vendor.storeId
    });
    
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
    
    // Check if only admin
    const admins = group.admins;
    if (admins.length === 1 && group.isAdmin(vendor._id)) {
      return res.status(400).json({ 
        error: 'Cannot leave group as the only admin. Transfer admin rights first.' 
      });
    }
    
    // Remove member
    await group.removeMember(vendor._id);
    
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
    
    if (!inviterUid || !inviteeUid) {
      return res.status(400).json({ error: 'inviterUid and inviteeUid are required' });
    }
    
    const [inviter, invitee] = await Promise.all([
      Vendor.findOne({ uid: inviterUid }),
      Vendor.findOne({ uid: inviteeUid })
    ]);
    
    if (!inviter || !invitee) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if inviter has permission
    const inviterMember = group.getMember(inviter._id);
    if (!inviterMember || !inviterMember.permissions.canInviteMembers) {
      return res.status(403).json({ error: 'No permission to invite members' });
    }
    
    // Check if invitee is already a member
    if (group.isMember(invitee._id)) {
      return res.status(400).json({ error: 'User is already a member' });
    }
    
    // Add member
    await group.addMember({
      vendorId: invitee._id,
      uid: invitee.uid,
      businessName: invitee.businessName,
      storeId: invitee.storeId
    });
    
    res.json({ success: true, message: 'Vendor invited successfully' });
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
    
    // Check if user is admin
    if (!group.isAdmin(vendor._id)) {
      return res.status(403).json({ error: 'Only admins can delete group' });
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

module.exports = router;
