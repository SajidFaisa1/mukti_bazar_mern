const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');

// Verify JWT and attach user obj to req
exports.protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorised' });
  }
  
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle different user types based on role in token
    if (decoded.role === 'admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) {
        return res.status(401).json({ error: 'Admin not found' });
      }
      req.user = { 
        id: admin._id, 
        role: 'admin', 
        email: admin.email,
        isAdmin: true
      };
    } else if (decoded.role === 'vendor') {
      const vendor = await Vendor.findById(decoded.id).select('-password');
      if (!vendor) {
        return res.status(401).json({ error: 'Vendor not found' });
      }
      req.user = { 
        id: vendor._id, 
        role: 'vendor',
        email: vendor.email,
        uid: vendor.uid
      };
    } else {
      // Default to client/user
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = { 
        id: user._id, 
        role: 'client',
        email: user.email,
        uid: user.uid
      };
    }
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based guard: pass allowed roles array
exports.permit = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
