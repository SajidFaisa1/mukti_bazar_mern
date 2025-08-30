# 🎯 Quick Guide: How to Test Fraud Detection

## 🚀 **Easiest Way to Test**

### **Option 1: Use the Testing Panel (Recommended)**
1. **Start your backend server**: `cd backend && npm start`
2. **Login as admin** in your React app
3. **Go to**: `/admin/test-fraud`
4. **Click the test buttons** to run automated tests
5. **Check results** in real-time

### **Option 2: Manual Testing**
1. **Login as a regular user**
2. **Add products to cart** with these quantities:
   - **Bulk Test**: 150+ items of any product
   - **High Value Test**: Products worth >৳50,000 total
3. **Go to checkout** and place the order
4. **Look for message**: "🛡️ Your order has been flagged for security review"

### **Option 3: Admin Panel Review**
1. **Login as admin**
2. **Go to**: `/admin/fraud-panel`
3. **Check pending orders** with suspicious flags
4. **Approve or reject** flagged orders

---

## 🔍 **What to Look For**

### **✅ Fraud Detection WORKING:**
```
Order Response:
{
  "message": "Orders submitted for admin review due to security flags",
  "securityInfo": {
    "requiresApproval": true,
    "totalFraudFlags": 1,
    "message": "🛡️ Your order has been flagged for security review"
  }
}
```

### **❌ Fraud Detection NOT WORKING:**
```
Order Response:
{
  "message": "Orders placed successfully",
  "securityInfo": {
    "requiresApproval": false,
    "totalFraudFlags": 0,
    "message": "✅ Order passed security checks"
  }
}
```

---

## 🧪 **Test Scenarios**

### **1. Bulk Hoarding Test**
- **Action**: Add 150+ items to cart and checkout
- **Expected**: Order flagged with "bulk_hoarding" flag
- **Severity**: High or Critical

### **2. High Value Test**
- **Action**: Create order worth >৳50,000
- **Expected**: Order flagged with "high_value" flag  
- **Severity**: High or Critical

### **3. Rapid Ordering Test**
- **Action**: Place 6+ orders within 30 minutes
- **Expected**: 6th+ order flagged with "rapid_ordering"
- **Severity**: High

### **4. Admin Review Test**
- **Action**: Review flagged orders in admin panel
- **Expected**: Can approve/reject orders successfully
- **Result**: Stock restored on rejection, order proceeds on approval

---

## 🛠️ **Troubleshooting**

### **Issue: No Orders Getting Flagged**
**Check:**
- Order quantities are actually >100 items
- Order values are actually >৳50,000
- Products exist in database
- Backend fraud detection code is running

### **Issue: Admin Panel Not Working**
**Check:**
- User has `role: "admin"` in database
- JWT token is valid
- Admin routes are registered in server.js
- Network tab shows successful API calls

### **Issue: Console Errors**
**Check:**
- Backend server is running on port 5005
- MongoDB is connected
- All required NPM packages installed
- CORS is configured correctly

---

## 📊 **Expected Database Changes**

After testing, check MongoDB for orders with:
```javascript
{
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

## 🎉 **Success Indicators**

### **✅ System is Working if:**
1. Large orders get flagged automatically
2. Admin panel shows pending orders
3. Fraud statistics are displayed
4. Orders can be approved/rejected
5. Stock is properly managed on rejection
6. Users get notified about review status

### **🚨 System Needs Fixing if:**
1. All orders pass without flags
2. Admin panel shows errors
3. Database doesn't show flagged orders
4. Approval/rejection doesn't work
5. Stock isn't restored on rejection

---

## 📞 **Quick Test Commands**

```bash
# 1. Start backend
cd backend && npm start

# 2. Check if products exist
curl http://localhost:5005/api/products

# 3. Test admin panel access (need admin token)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:5005/api/admin-panel/pending-orders
```

---

**🎯 Bottom Line**: If you can successfully flag a large order and see it in the admin panel for review, your fraud detection system is working correctly!
