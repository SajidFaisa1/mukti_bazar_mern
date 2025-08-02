const express = require('express');
const router = express.Router();
const Barter = require('../models/Barter');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Create a new barter offer
router.post('/offer', protect, async (req, res) => {
  try {
    const { 
      targetProductId, 
      targetQuantity, 
      offeredItems, 
      proposalMessage,
      qualityNotes,
      conditionRequirements 
    } = req.body;

    // Get the vendor's uid
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Get target product details
    const targetProduct = await Product.findById(targetProductId).populate('vendorUid');
    if (!targetProduct) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target product not found' 
      });
    }

    // Check if target product has barter available
    if (!targetProduct.barterAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'This product is not available for barter' 
      });
    }

    // Get target vendor
    const targetVendor = await Vendor.findOne({ uid: targetProduct.vendorUid });
    if (!targetVendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target vendor not found' 
      });
    }

    // Check if vendor is trying to barter with themselves
    if (vendor.uid === targetProduct.vendorUid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot create barter offer with yourself' 
      });
    }

    // Validate offered items belong to the proposing vendor
    const offeredProductIds = offeredItems.map(item => item.product);
    const vendorProducts = await Product.find({ 
      _id: { $in: offeredProductIds }, 
      vendorUid: vendor.uid 
    });

    if (vendorProducts.length !== offeredItems.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some offered products do not belong to you' 
      });
    }

    // Validate stock availability for offered items
    for (const item of offeredItems) {
      const product = vendorProducts.find(p => p._id.toString() === item.product);
      if (product.totalQty < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}. Available: ${product.totalQty}, Requested: ${item.quantity}` 
        });
      }
    }

    // Calculate target value
    const targetPrice = targetProduct.offerPrice || targetProduct.unitPrice;
    const targetValue = targetPrice * targetQuantity;

    // Prepare barter offer data
    const barterData = {
      proposingVendor: vendor._id,
      proposingVendorUid: vendor.uid,
      targetVendor: targetVendor._id,
      targetVendorUid: targetVendor.uid,
      targetProduct: targetProduct._id,
      targetQuantity,
      targetValue,
      offeredItems: offeredItems.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalValue: item.quantity * item.unitPrice,
        notes: item.notes || ''
      })),
      proposalMessage: proposalMessage || '',
      qualityNotes: qualityNotes || '',
      conditionRequirements: conditionRequirements || ''
    };

    // Create barter offer
    const barter = await Barter.createBarterOffer(barterData);
    
    console.log('✅ Barter created successfully:', barter._id);

    // Populate barter data for notification
    const newOfferBarter = await Barter.findById(barter._id)
      .populate('targetProduct')
      .populate('proposingVendor', 'businessName')
      .populate('targetVendor', 'businessName');

    // Send notification to target vendor
    try {
      await Notification.createBarterNotification(
        'new_barter_offer',
        newOfferBarter,
        vendor.uid
      );
      console.log('🔔 Barter notification sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending barter notification:', notificationError);
      // Don't fail the barter creation if notification fails
    }
    
    console.log('📊 Barter details:', {
      id: barter._id,
      proposingVendor: barter.proposingVendorUid,
      targetVendor: barter.targetVendorUid,
      status: barter.status,
      targetProduct: barter.targetProduct
    });
    
    // Verify it was actually saved by querying it back
    const savedBarter = await Barter.findById(barter._id);
    console.log('🔍 Verification - Barter exists in DB:', !!savedBarter);
    
    // Populate the created barter with product details
    const createdBarter = await Barter.findById(barter._id)
      .populate('targetProduct')
      .populate('offeredItems.product')
      .populate('proposingVendor', 'businessName email')
      .populate('targetVendor', 'businessName email');

    res.json({
      success: true,
      message: 'Barter offer created successfully',
      barter: createdBarter
    });

  } catch (error) {
    console.error('Barter offer creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create barter offer' 
    });
  }
});

// Get vendor's barter offers (both sent and received)
router.get('/', protect, async (req, res) => {
  try {
    const { type = 'all', status, page = 1, limit = 10 } = req.query;
    
    console.log('🔍 BARTER GET ENDPOINT - SIMPLIFIED DEBUG:');
    console.log('User ID:', req.user.id);
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      console.log('❌ Vendor not found for ID:', req.user.id);
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    console.log('✅ Vendor found:', vendor.businessName, 'UID:', vendor.uid);

    // Build simple query - the issue might be with isDeleted field
    let query = {};
    
    if (type === 'sent') {
      query.proposingVendorUid = vendor.uid;
    } else if (type === 'received') {
      query.targetVendorUid = vendor.uid;
    } else {
      // For 'all', find where vendor is either proposing OR target
      query.$or = [
        { proposingVendorUid: vendor.uid },
        { targetVendorUid: vendor.uid }
      ];
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Try WITHOUT isDeleted filter first to see if that's the issue
    console.log('� Query (without isDeleted):', JSON.stringify(query, null, 2));
    
    const bartersWithoutDeleted = await Barter.find(query).select('_id proposingVendorUid targetVendorUid status');
    console.log('� Found WITHOUT isDeleted filter:', bartersWithoutDeleted.length);
    
    if (bartersWithoutDeleted.length > 0) {
      bartersWithoutDeleted.forEach((barter, index) => {
        console.log(`  ${index + 1}. ID: ${barter._id}`);
        console.log(`     Proposing: "${barter.proposingVendorUid}"`);
        console.log(`     Target: "${barter.targetVendorUid}"`);
        console.log(`     Status: ${barter.status}`);
      });
    }
    
    // REMOVE isDeleted filter completely for now - this might be the issue
    // query.isDeleted = { $ne: true }; // This is more reliable than false
    console.log('📝 Query (WITHOUT isDeleted filter for testing):', JSON.stringify(query, null, 2));
    
    const skip = (page - 1) * limit;
    
    const barters = await Barter.find(query)
      .populate('targetProduct', 'name category images unitPrice businessName vendorUid')
      .populate('proposingVendor', 'businessName sellerName email storeId')
      .populate('targetVendor', 'businessName sellerName email storeId')
      .populate('offeredItems.product', 'name category images unitPrice businessName vendorUid')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('📊 Final result count:', barters.length);

    const total = await Barter.countDocuments(query);

    res.json({
      success: true,
      barters,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get barters error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get barter offers' 
    });
  }
});

// SIMPLE TEST ROUTE - Get barters where current vendor is the target
router.get('/received', protect, async (req, res) => {
  try {
    console.log('🔍 SIMPLE RECEIVED BARTERS ENDPOINT');
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    console.log('✅ Current vendor:', vendor.businessName, 'UID:', vendor.uid);
    
    // Simple query - find barters where this vendor is the target (NO isDeleted filter)
    const barters = await Barter.find({ targetVendorUid: vendor.uid })
      .populate('targetProduct', 'name category images unitPrice businessName vendorUid')
      .populate('proposingVendor', 'businessName sellerName email storeId')
      .populate('targetVendor', 'businessName sellerName email storeId')
      .populate('offeredItems.product', 'name category images unitPrice businessName vendorUid')
      .sort({ createdAt: -1 });
    
    console.log('📊 Found barters for target vendor:', barters.length);
    
    if (barters.length > 0) {
      barters.forEach((barter, index) => {
        console.log(`  ${index + 1}. Barter: ${barter.barterNumber}`);
        console.log(`     From: ${barter.proposingVendorUid}`);
        console.log(`     To: ${barter.targetVendorUid}`);
        console.log(`     Status: ${barter.status}`);
      });
    }

    res.json({
      success: true,
      barters,
      total: barters.length
    });

  } catch (error) {
    console.error('Get received barters error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get received barters' 
    });
  }
});

// Get specific barter offer details
router.get('/:barterId', protect, async (req, res) => {
  try {
    const { barterId } = req.params;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const barter = await Barter.findOne({
      _id: barterId,
      $or: [
        { proposingVendorUid: vendor.uid },
        { targetVendorUid: vendor.uid }
      ],
      isDeleted: false
    })
    .populate('targetProduct')
    .populate('offeredItems.product')
    .populate('counterOffer.items.product')
    .populate('proposingVendor', 'businessName email phone')
    .populate('targetVendor', 'businessName email phone');

    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter offer not found' 
      });
    }

    res.json({
      success: true,
      barter
    });

  } catch (error) {
    console.error('Get barter details error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get barter details' 
    });
  }
});

// Accept barter offer
router.put('/:barterId/accept', protect, async (req, res) => {
  try {
    const { barterId } = req.params;
    const { responseMessage, exchangeLocation, meetingTime } = req.body;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const barter = await Barter.findOne({
      _id: barterId,
      targetVendorUid: vendor.uid,
      status: 'pending',
      isDeleted: false
    });

    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter offer not found or cannot be accepted' 
      });
    }

    // Check if offer has expired
    if (barter.isExpired()) {
      barter.status = 'expired';
      await barter.save();
      return res.status(400).json({ 
        success: false, 
        message: 'Barter offer has expired' 
      });
    }

    // Update exchange details if provided
    if (exchangeLocation || meetingTime) {
      barter.exchangeLocation = {
        ...barter.exchangeLocation,
        ...exchangeLocation,
        meetingTime: meetingTime ? new Date(meetingTime) : barter.exchangeLocation?.meetingTime
      };
    }

    await barter.acceptOffer(responseMessage);

    const acceptedBarter = await Barter.findById(barter._id)
      .populate('targetProduct')
      .populate('offeredItems.product')
      .populate('proposingVendor', 'businessName email')
      .populate('targetVendor', 'businessName email');

    // Send notification to proposing vendor
    try {
      await Notification.createBarterNotification(
        'barter_accepted',
        acceptedBarter,
        vendor.uid
      );
      console.log('🔔 Barter acceptance notification sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending barter acceptance notification:', notificationError);
      // Don't fail the acceptance if notification fails
    }

    res.json({
      success: true,
      message: 'Barter offer accepted successfully',
      barter: acceptedBarter
    });

  } catch (error) {
    console.error('Accept barter error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to accept barter offer' 
    });
  }
});

// Reject barter offer
router.put('/:barterId/reject', protect, async (req, res) => {
  try {
    const { barterId } = req.params;
    const { responseMessage } = req.body;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const barter = await Barter.findOne({
      _id: barterId,
      targetVendorUid: vendor.uid,
      status: 'pending',
      isDeleted: false
    });

    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter offer not found or cannot be rejected' 
      });
    }

    await barter.rejectOffer(responseMessage);

    // Populate barter data for notification
    const rejectedBarter = await Barter.findById(barter._id)
      .populate('targetProduct')
      .populate('proposingVendor', 'businessName')
      .populate('targetVendor', 'businessName');

    // Send notification to proposing vendor  
    try {
      await Notification.createBarterNotification(
        'barter_rejected',
        rejectedBarter,
        vendor.uid
      );
      console.log('🔔 Barter rejection notification sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending barter rejection notification:', notificationError);
      // Don't fail the rejection if notification fails
    }

    res.json({
      success: true,
      message: 'Barter offer rejected successfully'
    });

  } catch (error) {
    console.error('Reject barter error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to reject barter offer' 
    });
  }
});

// Create counter offer
router.put('/:barterId/counter', protect, async (req, res) => {
  try {
    const { barterId } = req.params;
    const { items, cashAdjustment, message } = req.body;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const barter = await Barter.findOne({
      _id: barterId,
      targetVendorUid: vendor.uid,
      status: 'pending',
      isDeleted: false
    });

    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter offer not found or cannot be countered' 
      });
    }

    // Validate counter offer items belong to the target vendor
    const offeredProductIds = items.map(item => item.product);
    const vendorProducts = await Product.find({ 
      _id: { $in: offeredProductIds }, 
      vendorUid: vendor.uid 
    });

    if (vendorProducts.length !== items.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some offered products do not belong to you' 
      });
    }

    const counterOfferData = {
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalValue: item.quantity * item.unitPrice,
        notes: item.notes || ''
      })),
      cashAdjustment: cashAdjustment || 0,
      message: message || ''
    };

    await barter.createCounterOffer(counterOfferData);

    const counteredBarter = await Barter.findById(barter._id)
      .populate('targetProduct')
      .populate('offeredItems.product')
      .populate('counterOffer.items.product')
      .populate('proposingVendor', 'businessName email')
      .populate('targetVendor', 'businessName email');

    // Send notification to proposing vendor
    try {
      await Notification.createBarterNotification(
        'barter_counter_offer',
        counteredBarter,
        vendor.uid
      );
      console.log('🔔 Barter counter offer notification sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending barter counter offer notification:', notificationError);
      // Don't fail the counter offer if notification fails
    }

    res.json({
      success: true,
      message: 'Counter offer created successfully',
      barter: counteredBarter
    });

  } catch (error) {
    console.error('Counter offer error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create counter offer' 
    });
  }
});

// Complete barter (mark as completed)
router.put('/:barterId/complete', protect, async (req, res) => {
  try {
    const { barterId } = req.params;
    const { rating, feedback } = req.body;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const barter = await Barter.findOne({
      _id: barterId,
      $or: [
        { proposingVendorUid: vendor.uid },
        { targetVendorUid: vendor.uid }
      ],
      status: 'accepted',
      isDeleted: false
    });

    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter offer not found or cannot be completed' 
      });
    }

    // Add rating and feedback
    if (rating && feedback) {
      if (barter.proposingVendorUid === vendor.uid) {
        barter.rating.proposingVendorRating = rating;
        barter.rating.proposingVendorFeedback = feedback;
      } else {
        barter.rating.targetVendorRating = rating;
        barter.rating.targetVendorFeedback = feedback;
      }
    }

    await barter.completeBarter();

    res.json({
      success: true,
      message: 'Barter completed successfully'
    });

  } catch (error) {
    console.error('Complete barter error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to complete barter' 
    });
  }
});

// Get vendor's own products for barter offers
router.get('/vendor/products', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    const products = await Product.find({
      vendorUid: vendor.uid,
      isApproved: true,
      isDeleted: false,
      totalQty: { $gt: 0 } // Only products with stock
    }).select('name images unitPrice offerPrice totalQty unitType category');

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get vendor products' 
    });
  }
});

// TEMPORARY DEBUG ENDPOINT - Remove after debugging
router.get('/debug/test', async (req, res) => {
  try {
    console.log('🧪🧪🧪 DEBUG TEST ENDPOINT CALLED - THIS SHOULD DEFINITELY APPEAR 🧪🧪🧪');
    console.log('Current time:', new Date().toISOString());
    
    // Hardcode the vendor UID for testing
    const vendorUid = 'SRXjruiUmOOV12ScJJPWYGtcAYs2';
    console.log('🔍 Testing with vendor UID:', vendorUid);
    
    // First, let's check what barters exist in total
    const allBarters = await Barter.find({});
    console.log('🗄️ Total barters in database:', allBarters.length);
    allBarters.forEach((barter, index) => {
      console.log(`  ${index + 1}. ID: ${barter._id}`);
      console.log(`     proposingVendorUid: "${barter.proposingVendorUid}"`);
      console.log(`     targetVendorUid: "${barter.targetVendorUid}"`);
      console.log(`     status: ${barter.status}`);
      console.log(`     isDeleted: ${barter.isDeleted}`);
      console.log('     ---');
    });
    
    const query = {
      $or: [
        { proposingVendorUid: vendorUid },
        { targetVendorUid: vendorUid }
      ],
      isDeleted: false
    };
    
    console.log('🔍 Test query:', JSON.stringify(query, null, 2));
    
    // Try without population
    console.log('🔍 Executing query without population...');
    const bartersWithoutPopulation = await Barter.find(query);
    console.log('📊 Found without population:', bartersWithoutPopulation.length);
    
    if (bartersWithoutPopulation.length > 0) {
      bartersWithoutPopulation.forEach((barter, index) => {
        console.log(`  ${index + 1}. Found: ${barter._id}`);
        console.log(`     proposingVendorUid: "${barter.proposingVendorUid}"`);
        console.log(`     targetVendorUid: "${barter.targetVendorUid}"`);
        console.log('     ---');
      });
    } else {
      console.log('❌ No barters found with query. Let me test individual parts...');
      
      // Test individual query parts
      const testProposing = await Barter.find({ proposingVendorUid: vendorUid });
      console.log('🔍 Barters where proposing =', vendorUid, ':', testProposing.length);
      
      const testTarget = await Barter.find({ targetVendorUid: vendorUid });
      console.log('🔍 Barters where target =', vendorUid, ':', testTarget.length);
      
      const testNotDeleted = await Barter.find({ isDeleted: false });
      console.log('� Barters where isDeleted = false:', testNotDeleted.length);
      
      const testNotDeletedUndefined = await Barter.find({ isDeleted: { $ne: true } });
      console.log('🔍 Barters where isDeleted != true:', testNotDeletedUndefined.length);
    }
    
    res.json({
      success: true,
      totalBarters: allBarters.length,
      withoutPopulation: bartersWithoutPopulation.length,
      query: query
    });
    
  } catch (error) {
    console.error('🧪 Debug test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept a barter offer
router.post('/:barterId/accept', protect, async (req, res) => {
  try {
    const { responseMessage } = req.body;
    const barterId = req.params.barterId;

    // Get the vendor's uid
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Find the barter
    const barter = await Barter.findById(barterId);
    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter not found' 
      });
    }

    // Check if this vendor is the target vendor
    if (barter.targetVendorUid !== vendor.uid) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to accept this barter offer' 
      });
    }

    // Check if barter is in pending status
    if (barter.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'This barter offer cannot be accepted' 
      });
    }

    // Accept the barter
    const updatedBarter = await barter.acceptOffer(responseMessage);

    res.json({
      success: true,
      message: 'Barter offer accepted successfully',
      barter: updatedBarter
    });

  } catch (error) {
    console.error('❌ Accept barter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Reject a barter offer
router.post('/:barterId/reject', protect, async (req, res) => {
  try {
    const { responseMessage } = req.body;
    const barterId = req.params.barterId;

    // Get the vendor's uid
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Find the barter
    const barter = await Barter.findById(barterId);
    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter not found' 
      });
    }

    // Check if this vendor is the target vendor
    if (barter.targetVendorUid !== vendor.uid) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to reject this barter offer' 
      });
    }

    // Check if barter is in pending status
    if (barter.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'This barter offer cannot be rejected' 
      });
    }

    // Reject the barter
    const updatedBarter = await barter.rejectOffer(responseMessage);

    res.json({
      success: true,
      message: 'Barter offer rejected successfully',
      barter: updatedBarter
    });

  } catch (error) {
    console.error('❌ Reject barter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Create counter offer
router.post('/:barterId/counter', protect, async (req, res) => {
  try {
    const { items, totalValue, cashAdjustment, message } = req.body;
    const barterId = req.params.barterId;

    // Get the vendor's uid
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }

    // Find the barter
    const barter = await Barter.findById(barterId);
    if (!barter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barter not found' 
      });
    }

    // Check if this vendor is the target vendor
    if (barter.targetVendorUid !== vendor.uid) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to counter this barter offer' 
      });
    }

    // Check if barter is in pending status
    if (barter.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'This barter offer cannot be countered' 
      });
    }

    // Validate counter offer data
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Counter offer items are required' 
      });
    }

    // Create the counter offer
    const counterOfferData = {
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalValue: item.quantity * item.unitPrice,
        notes: item.notes || ''
      })),
      totalValue: totalValue || items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      cashAdjustment: cashAdjustment || 0,
      message: message || ''
    };

    // Create counter offer
    const updatedBarter = await barter.createCounterOffer(counterOfferData);

    res.json({
      success: true,
      message: 'Counter offer sent successfully',
      barter: updatedBarter
    });

  } catch (error) {
    console.error('❌ Counter offer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
