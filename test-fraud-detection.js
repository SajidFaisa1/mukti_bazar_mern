// Test script for fraud detection system
// Run this with: node test-fraud-detection.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5005';
let userToken = '';
let adminToken = '';

// Test data
const testUser = {
  email: 'testuser@example.com',
  password: 'password123'
};

const testAdmin = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Helper function to make API calls
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test functions
async function login(credentials, isAdmin = false) {
  try {
    const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/login';
    const response = await api.post(endpoint, credentials);
    
    if (response.data.success && response.data.token) {
      console.log(`✅ ${isAdmin ? 'Admin' : 'User'} login successful`);
      return response.data.token;
    } else {
      console.log(`❌ ${isAdmin ? 'Admin' : 'User'} login failed:`, response.data.message);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${isAdmin ? 'Admin' : 'User'} login error:`, error.message);
    return null;
  }
}

async function testBulkOrder() {
  console.log('\n🧪 Testing Bulk Order Detection (>100 items)...');
  
  try {
    // Get available products
    const productsResponse = await api.get('/api/products?limit=1');
    const products = productsResponse.data.products || productsResponse.data;
    
    if (!products || products.length === 0) {
      console.log('❌ No products available for testing');
      return;
    }
    
    const testProduct = products[0];
    console.log(`📦 Using product: ${testProduct.name} (ID: ${testProduct._id})`);
    
    // First add to cart
    const cartResponse = await api.post('/api/cart/add', {
      productId: testProduct._id,
      quantity: 150 // This should trigger bulk_hoarding flag
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    if (cartResponse.data.success) {
      console.log('✅ Added 150 items to cart');
      
      // Now checkout
      const checkoutResponse = await api.post('/api/orders/checkout', {
        paymentMethod: 'cod',
        notes: 'Fraud detection test - bulk order'
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (checkoutResponse.data.success) {
        const { securityInfo, message } = checkoutResponse.data;
        
        console.log('📋 Checkout Response:');
        console.log('   Message:', message);
        console.log('   Requires Approval:', securityInfo?.requiresApproval);
        console.log('   Total Fraud Flags:', securityInfo?.totalFraudFlags);
        
        if (securityInfo?.requiresApproval) {
          console.log('✅ BULK ORDER DETECTION WORKING! Order flagged for review.');
          return checkoutResponse.data.orderIds[0];
        } else {
          console.log('❌ BULK ORDER DETECTION FAILED! Order was not flagged.');
        }
      }
    }
  } catch (error) {
    console.log('❌ Bulk order test failed:', error.response?.data?.message || error.message);
  }
}

async function testRapidOrdering() {
  console.log('\n🧪 Testing Rapid Ordering Detection (>5 orders in 24h)...');
  
  try {
    const productsResponse = await api.get('/api/products?limit=1');
    const products = productsResponse.data.products || productsResponse.data;
    
    if (!products || products.length === 0) {
      console.log('❌ No products available for testing');
      return;
    }
    
    const testProduct = products[0];
    
    // Place 6 small orders quickly
    for (let i = 1; i <= 6; i++) {
      try {
        // Add to cart
        await api.post('/api/cart/add', {
          productId: testProduct._id,
          quantity: 1
        }, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        // Checkout
        const checkoutResponse = await api.post('/api/orders/checkout', {
          paymentMethod: 'cod',
          notes: `Rapid order test #${i}`
        }, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        if (checkoutResponse.data.success) {
          const { securityInfo } = checkoutResponse.data;
          console.log(`   Order ${i}: Flagged = ${securityInfo?.requiresApproval || false}`);
          
          if (i >= 6 && securityInfo?.requiresApproval) {
            console.log('✅ RAPID ORDERING DETECTION WORKING! Order flagged after multiple orders.');
            return;
          }
        }
        
        // Small delay between orders
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Order ${i} failed:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('❌ RAPID ORDERING DETECTION may not be working. Check if all orders passed.');
    
  } catch (error) {
    console.log('❌ Rapid ordering test failed:', error.response?.data?.message || error.message);
  }
}

async function testAdminPanel() {
  console.log('\n🧪 Testing Admin Panel Access...');
  
  try {
    // Get pending orders
    const pendingResponse = await api.get('/api/admin-panel/pending-orders', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (pendingResponse.data.orders) {
      console.log('✅ Admin panel accessible');
      console.log(`   Pending orders: ${pendingResponse.data.orders.length}`);
      
      // Show fraud statistics
      pendingResponse.data.orders.forEach((order, index) => {
        console.log(`   Order ${index + 1}: ${order.orderNumber}`);
        console.log(`     Flags: ${order.suspiciousFlags?.length || 0}`);
        order.suspiciousFlags?.forEach(flag => {
          console.log(`     - ${flag.type} (${flag.severity}): ${flag.description}`);
        });
      });
      
      // Test fraud dashboard
      const dashboardResponse = await api.get('/api/admin-panel/fraud-dashboard', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (dashboardResponse.data.summary) {
        console.log('\n📊 Fraud Dashboard Stats:');
        const { summary } = dashboardResponse.data;
        console.log(`   Recent Suspicious: ${summary.recentSuspicious}`);
        console.log(`   Total Pending: ${summary.totalPending}`);
        console.log(`   Suspicious IPs: ${summary.suspiciousIPCount}`);
        console.log(`   Rapid Order Users: ${summary.rapidOrderUsers}`);
      }
      
      return pendingResponse.data.orders[0]?._id;
      
    } else {
      console.log('❌ Admin panel access failed');
    }
  } catch (error) {
    console.log('❌ Admin panel test failed:', error.response?.data?.error || error.message);
  }
}

async function testOrderReview(orderId) {
  if (!orderId) {
    console.log('\n⏭️  Skipping order review test - no pending order available');
    return;
  }
  
  console.log('\n🧪 Testing Order Review (Approve/Reject)...');
  
  try {
    // Test approving an order
    const reviewResponse = await api.patch(`/api/admin-panel/orders/${orderId}/review`, {
      action: 'approve',
      reason: 'Test approval - fraud detection working correctly',
      notes: 'This was a test order to verify fraud detection system'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (reviewResponse.data.message) {
      console.log('✅ Order review working:', reviewResponse.data.message);
    } else {
      console.log('❌ Order review failed');
    }
  } catch (error) {
    console.log('❌ Order review test failed:', error.response?.data?.error || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Fraud Detection System Tests...\n');
  
  // Step 1: Login as user
  console.log('🔐 Logging in as user...');
  userToken = await login(testUser);
  if (!userToken) {
    console.log('❌ Cannot proceed without user token. Please check user credentials or create test user.');
    return;
  }
  
  // Step 2: Login as admin
  console.log('🔐 Logging in as admin...');
  adminToken = await login(testAdmin, true);
  if (!adminToken) {
    console.log('❌ Cannot test admin features without admin token. Continuing with user tests only.');
  }
  
  // Step 3: Test bulk order detection
  const testOrderId = await testBulkOrder();
  
  // Step 4: Test rapid ordering
  await testRapidOrdering();
  
  // Step 5: Test admin panel (if admin token available)
  if (adminToken) {
    const pendingOrderId = await testAdminPanel();
    await testOrderReview(pendingOrderId || testOrderId);
  }
  
  console.log('\n🎉 Fraud Detection Tests Complete!');
  console.log('\n📝 Summary:');
  console.log('   - Check console output above for test results');
  console.log('   - Look for ✅ (success) and ❌ (failure) indicators');
  console.log('   - Review server logs for additional fraud detection logging');
  console.log('\n🔧 Next Steps:');
  console.log('   1. Check the admin panel at: /admin/fraud-panel');
  console.log('   2. Review flagged orders in the database');
  console.log('   3. Test with different fraud scenarios as needed');
}

// Run the tests
runTests().catch(console.error);

module.exports = {
  testBulkOrder,
  testRapidOrdering,
  testAdminPanel,
  testOrderReview
};
