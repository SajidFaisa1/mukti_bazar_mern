# 🛡️ Fraud Detection Testing Guide

## How to Test the Anti-Syndicate Fraud Detection System

### Prerequisites
1. **Backend server running** on `http://localhost:5005`
2. **Admin account** with `role: "admin"` in your database
3. **Test user account** for placing orders
4. **Test products** in the database

---

## 🧪 Testing Steps

### 1. **Setup Test Data**

First, ensure you have test products available:
```bash
# Check if you have products
curl http://localhost:5005/api/products
```

### 2. **Test Bulk Order Detection (>100 items)**

**Scenario**: Place an order with more than 100 items to trigger "bulk_hoarding" flag

**Steps**:
1. Login as a regular user
2. Add products to cart with quantities that total >100 items
3. Go to checkout
4. Complete the order
5. **Expected Result**: Order should be flagged for admin review

**API Test**:
```bash
# Place a large order via API
curl -X POST http://localhost:5005/api/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "paymentMethod": "cod",
    "items": [
      {"productId": "PRODUCT_ID", "quantity": 150}
    ]
  }'
```

### 3. **Test High-Value Order Detection (>৳50,000)**

**Scenario**: Place an expensive order to trigger "high_value" flag

**Steps**:
1. Add expensive products totaling >৳50,000 to cart
2. Checkout
3. **Expected Result**: Order flagged for review

### 4. **Test Rapid Ordering Detection (>5 orders in 24h)**

**Scenario**: Place multiple orders quickly

**Steps**:
1. Place 6 orders within a few minutes
2. **Expected Result**: 6th order should be flagged for "rapid_ordering"

### 5. **Test Admin Panel Access**

**Steps**:
1. Login as admin
2. Go to `/admin/fraud-panel`
3. **Expected Result**: See dashboard with flagged orders

---

## 🔧 Manual Testing Methods

### Method 1: Using the Web Interface

1. **Create Large Cart**:
   ```
   - Go to products page
   - Add multiple items with high quantities
   - Total should exceed 100 items
   - Proceed to checkout
   ```

2. **Check Order Status**:
   ```
   - After checkout, check response message
   - Should say "Orders submitted for admin review"
   - Look for securityInfo in the response
   ```

3. **Admin Review**:
   ```
   - Login as admin
   - Go to /admin/fraud-panel
   - Should see the flagged order
   - Try approving/rejecting it
   ```

### Method 2: Using Browser Developer Tools

1. **Open Network Tab** in DevTools
2. **Place Order** and watch the request/response
3. **Look for**:
   ```json
   {
     "securityInfo": {
       "requiresApproval": true,
       "totalFraudFlags": 1,
       "message": "🛡️ Your order has been flagged for security review"
     }
   }
   ```

### Method 3: Database Inspection

**Check Orders Collection**:
```javascript
// In MongoDB
db.orders.find({
  requiresApproval: true,
  "suspiciousFlags.0": { $exists: true }
})
```

**Expected Document Structure**:
```javascript
{
  "_id": "...",
  "orderNumber": "ORD-12345678-ABCD",
  "requiresApproval": true,
  "suspiciousFlags": [
    {
      "type": "bulk_hoarding",
      "description": "Large order quantity: 150 items",
      "severity": "high",
      "flaggedAt": "2025-01-20T..."
    }
  ],
  "securityInfo": {
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "location": {...}
  },
  "adminApproval": {
    "status": "pending"
  }
}
```

---

## 🚨 Testing Different Fraud Scenarios

### Scenario 1: Bulk Hoarding
```json
{
  "items": [
    {"productId": "rice123", "quantity": 200}
  ],
  "expectedFlag": "bulk_hoarding",
  "severity": "critical"
}
```

### Scenario 2: High Value
```json
{
  "items": [
    {"productId": "expensive_machinery", "quantity": 1, "price": 75000}
  ],
  "expectedFlag": "high_value",
  "severity": "high"
}
```

### Scenario 3: Rapid Ordering
```
Place 6+ orders within 30 minutes:
- Order 1-5: Should pass normally
- Order 6+: Should trigger "rapid_ordering" flag
```

### Scenario 4: Multiple IPs (Advanced)
```
Use different networks/VPN to place orders:
- Same user, different IP addresses
- Should trigger "multiple_devices" flag after 3+ IPs
```

---

## 🔍 Debugging Tips

### Check Server Logs
```bash
# Look for fraud detection logs
tail -f backend/logs/server.log | grep "🚨"
```

### Console Logging
The system logs fraud flags:
```javascript
console.log(`🚨 Fraud flags detected for order ${order.orderNumber}:`, fraudFlags);
```

### API Endpoints to Test

1. **Place Order**: `POST /api/orders/checkout`
2. **View Pending Orders**: `GET /api/admin-panel/pending-orders`
3. **Fraud Dashboard**: `GET /api/admin-panel/fraud-dashboard`
4. **Review Order**: `PATCH /api/admin-panel/orders/:id/review`

---

## ✅ Expected Test Results

### Normal Order (No Flags)
```json
{
  "success": true,
  "message": "Orders placed successfully",
  "securityInfo": {
    "requiresApproval": false,
    "totalFraudFlags": 0,
    "message": "✅ Order passed security checks"
  }
}
```

### Flagged Order
```json
{
  "success": true,
  "message": "Orders submitted for admin review due to security flags",
  "securityInfo": {
    "requiresApproval": true,
    "totalFraudFlags": 1,
    "message": "🛡️ Your order has been flagged for security review. You will be notified once approved."
  }
}
```

### Admin Panel Response
```json
{
  "orders": [
    {
      "orderNumber": "ORD-12345678-ABCD",
      "suspiciousFlags": [
        {
          "type": "bulk_hoarding",
          "severity": "high"
        }
      ],
      "requiresApproval": true
    }
  ],
  "fraudStats": [...]
}
```

---

## 🐛 Troubleshooting

### Issue: No Orders Being Flagged
**Check**:
1. Order quantities are actually >100
2. Order values are actually >৳50,000  
3. User has placed >5 orders in 24h
4. Server logs for errors

### Issue: Admin Panel Not Loading
**Check**:
1. Admin user has `role: "admin"`
2. JWT token is valid
3. Admin routes are properly registered
4. Network tab for API errors

### Issue: Database Errors
**Check**:
1. MongoDB connection
2. Order model is updated with new schema
3. Indexes are created properly

---

## 🎯 Quick Test Commands

```bash
# 1. Start backend
cd backend && npm start

# 2. Create test order with high quantity
curl -X POST http://localhost:5005/api/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"paymentMethod": "cod", "items": [{"productId": "TEST_ID", "quantity": 150}]}'

# 3. Check admin panel
curl -X GET http://localhost:5005/api/admin-panel/pending-orders \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Approve order
curl -X PATCH http://localhost:5005/api/admin-panel/orders/ORDER_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"action": "approve", "reason": "Test approval"}'
```

This comprehensive testing approach will help you verify that the fraud detection system is working correctly!
