const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
require('./config/db'); // Connect to MongoDB
const Vendor = require('./models/Vendor');
const User = require('./models/User');

// Routers
const vendorRoutes = require('./routes/vendor');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products'); // <- matches file name

const app = express();

app.use(express.json({ limit: '10mb' }));        // ⬅️ raise as needed
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// CORS must be applied **before** defining any routes so that pre-flight
// OPTIONS requests are handled correctly for every endpoint.
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost (dev) or requests without an Origin header
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle pre-flight requests quickly
// Explicit wildcard for Express compatibility





// Mount routers
app.use('/api/vendors', vendorRoutes);
app.use('/api/clients', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ---------------------------
// Deprecated legacy JSON endpoints
// These routes originally relied on JSON file persistence and have been
// fully superseded by the modular MongoDB-backed routers defined in
// ./routes/vendor.js and ./routes/user.js.  To prevent any accidental
// usage we register lightweight handlers that immediately return
// HTTP 410 Gone.
// ---------------------------
['/api/vendor/signup',
 '/api/client/signup',
 '/api/vendors/approve/:id',
 '/api/vendors/pending',
 '/api/users',
 '/api/vendors']
  .forEach((routePath) => {
    app.all(routePath, (req, res) => {
      return res.status(410).json({
        error: 'Deprecated endpoint. Please use the updated API routes.'
      });
    });
  });

// Mount additional router
app.use('/api/products', productRoutes);




// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Legacy JSON persistence fully removed

// Function to save vendor to file
const saveVendor = async (vendorData) => {
  try {
    // Read existing vendors
    let vendors = [];
    try {
      const data = await fs.promises.readFile(vendorsFilePath, 'utf8');
      vendors = JSON.parse(data);
    } catch (error) {
      console.log('No existing vendors file, creating new one');
    }

    // Create or update vendor
    const vendor = {
      id: vendorData.uid || vendorData.id || `vendor-${Date.now()}`,
      uid: vendorData.uid || vendorData.id, // Ensure uid is set from either uid or id
      name: vendorData.name,
      email: vendorData.email,
      password: vendorData.password, // Ensure password is included
      phone: vendorData.phone,
      businessName: vendorData.businessName,
      address: vendorData.address || {},
      farmSize: vendorData.farmSize,
      farmType: vendorData.farmType,
      crops: vendorData.crops || [],
      farmingLicense: vendorData.farmingLicense || {},
      kycDocument: vendorData.kycDocument || {},
      vendorProfileImage: vendorData.vendorProfileImage || {},
      role: 'vendor',
      isApproved: vendorData.isApproved || false,
      emailVerified: vendorData.emailVerified || false,
      isActive: vendorData.isActive !== undefined ? vendorData.isActive : true,
      createdAt: vendorData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null
    };

    console.log('Saving vendor:', JSON.stringify(vendor, null, 2));
    
    // Add or update vendor in the array
    const index = vendors.findIndex(v => v.id === vendor.id);
    if (index >= 0) {
      vendors[index] = vendor;
    } else {
      vendors.push(vendor);
    }
    
    // Debug: Log the data that will be saved
    console.log('Saving vendors array:', JSON.stringify(vendors, null, 2));
    
    // Save to file
    await fs.promises.writeFile(vendorsFilePath, JSON.stringify(vendors, null, 2));
    console.log('Vendor saved successfully');
    
    // Verify the file was written correctly
    try {
      const savedData = await fs.promises.readFile(vendorsFilePath, 'utf8');
      console.log('Vendors file content after save:', savedData);
    } catch (error) {
      console.error('Error reading vendors file after save:', error);
    }
    
    return vendor;
  } catch (error) {
    console.error('Error saving vendor:', error);
    throw error;
  }
};

// Function to save client to file
const saveClient = async (clientData) => {
  try {
    let users = [];
    
    // Read existing users
    if (fs.existsSync(usersFilePath)) {
      const data = await fs.promises.readFile(usersFilePath, 'utf8');
      users = data ? JSON.parse(data) : [];
    }
    
    // Generate a new ID if not provided and not a Firebase user
    const id = clientData.id || (clientData.uid ? clientData.uid : Date.now().toString());
    
    // Prepare client data with proper defaults
    const client = {
      id,
      name: clientData.name || '',
      email: clientData.email.toLowerCase(), // Store email in lowercase for case-insensitive matching
      phone: clientData.phone || '',
      address: clientData.address || {},
      role: 'client',
      isActive: clientData.isActive !== undefined ? clientData.isActive : true,
      emailVerified: clientData.emailVerified || false,
      uid: clientData.uid || null, // Store Firebase UID if available
      createdAt: clientData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: clientData.lastLogin || null,
      isApproved: true, // Clients are auto-approved by default
      profileImage: clientData.profileImage || null
    };
    
    // Check if user already exists by email or UID
    const existingUserIndex = users.findIndex(u => 
      u.email.toLowerCase() === client.email.toLowerCase() ||
      (u.uid && client.uid && u.uid === client.uid)
    );
    
    if (existingUserIndex >= 0) {
      // Preserve existing data and update with new values
      const existingUser = users[existingUserIndex];
      users[existingUserIndex] = { 
        ...existingUser,
        name: client.name || existingUser.name,
        phone: client.phone || existingUser.phone,
        address: { ...existingUser.address, ...(client.address || {}) },
        isActive: client.isActive !== undefined ? client.isActive : existingUser.isActive,
        emailVerified: client.emailVerified !== undefined ? client.emailVerified : existingUser.emailVerified,
        uid: client.uid || existingUser.uid, // Only update UID if it's being set
        updatedAt: client.updatedAt,
        lastLogin: client.lastLogin || existingUser.lastLogin,
        profileImage: client.profileImage || existingUser.profileImage
        // Preserve existing values for these fields
      };
    } else {
      // New user
      users.push(client);
    }
    
    // Save to file
    await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    console.log('Client saved to file');
    return users[existingUserIndex >= 0 ? existingUserIndex : users.length - 1];
  } catch (error) {
    console.error('Error saving client:', error);
    throw error;
  }
};

// Vendor Signup endpoint
app.post('/api/vendor/signup', upload.fields([
  { name: 'vendorProfileImage', maxCount: 1 },
  { name: 'kycDocument', maxCount: 1 },
  { name: 'farmingLicense', maxCount: 1 }
]), async (req, res) => {
  console.log('Received vendor signup request. Files:', req.files);
  try {
    // Parse vendor data from request
    console.log('Raw request body:', req.body);
    const userData = JSON.parse(req.body.userData);
    console.log('Parsed userData:', userData);
    console.log('Password in request:', userData.password ? 'Present' : 'Missing');
    
    // Read existing vendors and users to check for duplicates
    const vendors = JSON.parse(await fs.promises.readFile(vendorsFilePath, 'utf8'));
    const users = JSON.parse(await fs.promises.readFile(usersFilePath, 'utf8'));
    
    // Check for duplicate email or phone
    const emailExists = [...vendors, ...users].some(user => 
      user.email === userData.email
    );
    
    const phoneExists = [...vendors, ...users].some(user => 
      user.phone === userData.phone
    );
    
    if (emailExists) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    if (phoneExists) {
      return res.status(400).json({ error: 'Phone number already in use' });
    }
    
    // Create vendor object with all required fields
    console.log('Creating vendor with UID:', userData.uid || 'Not provided');
    const vendorData = {
      uid: userData.uid,
      storeId: randomUUID().slice(0, 8),
      sellerName: userData.sellerName || userData.name || '',
      email: userData.email,
      password: await bcrypt.hash(userData.password, 10), // Hashed password
      phone: userData.phone,
      businessName: userData.businessName,
      address: userData.address || {},
      shopLogo: userData.shopLogo || {},
      farmingLicense: userData.farmingLicense || {},
      kycDocument: userData.kycDocument || {},
      role: 'vendor',
      isApproved: false, // Needs admin approval
      profileCompleted: false,
      emailVerified: userData.emailVerified || false,
      isActive: true
    };
    
    // The saveVendor function will handle setting id, timestamps, etc.
    console.log('Vendor data before save:', JSON.stringify(vendorData, null, 2));

    // Handle file uploads
    if (req.files?.vendorProfileImage) {
      vendorData.vendorProfileImage = {
        filename: req.files.vendorProfileImage[0].filename,
        path: req.files.vendorProfileImage[0].path
      };
    }
    if (req.files?.kycDocument) {
      vendorData.kycDocument = {
        filename: req.files.kycDocument[0].filename,
        path: req.files.kycDocument[0].path
      };
    }
    if (req.files?.farmingLicense) {
      vendorData.farmingLicense = {
        filename: req.files.farmingLicense[0].filename,
        path: req.files.farmingLicense[0].path
      };
    }
    
    // Save vendor data to MongoDB
    await new Vendor(vendorData).save();
    
    res.status(201).json({ 
      message: 'Vendor registered successfully. Waiting for admin approval.' 
    });
  } catch (error) {
    console.error('Error in vendor signup:', error);
    res.status(500).json({ error: error.message || 'Failed to create vendor account' });
  }
});

// Client Signup endpoint (MongoDB)
app.post('/api/client/signup', async (req, res) => {
  try {
    const clientData = req.body;
    const client = await saveClient(clientData);
    console.log('New client added:', client);
    res.status(201).json(client);
  } catch (error) {
    console.error('Error in client signup:', error);
    res.status(500).json({ error: 'Failed to create client account' });
  }
});

// Mock responses for agriculture questions
const mockResponses = [
  'ধান চাষের জন্য সবচেয়ে উপযুক্ত সময় হল বর্ষা মৌসুম। মাটি প্রস্তুতি থেকে শুরু করে বীজ বপন, সার প্রয়োগ সবই সঠিক সময়ে করতে হবে।',
  'সবজি চাষে জৈব সার ব্যবহার করলে ফসলের গুণগত মান বাড়ে এবং মাটির উর্বরতা বজায় থাকে।',
  'ফসলের রোগ প্রতিরোধে নিয়মিত পর্যবেক্ষণ এবং সময়মত ব্যবস্থা নেওয়া জরুরি।',
  'আধুনিক কৃষি পদ্ধতি অনুসরণ করে ফসলের উৎপাদন বাড়ানো সম্ভব।',
  'জলবায়ু পরিবর্তনের প্রভাব মোকাবেলায় খরা সহনশীল ফসলের জাত বেছে নিন।'
];



app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    
    // Validate request body
    if (!req.body || !Array.isArray(req.body.messages)) {
      return res.status(400).json({ error: 'Invalid request body. Messages array is required.' });
    }

    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;
    
    // Get a random mock response
    const responseText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    console.log('Response:', responseText);

    res.json({
      success: true,
      response: responseText
    });
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: error.message
    });
  }
});


// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Middleware error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

const PORT = process.env.PORT || 5005;
// Serve uploaded files
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Vendor management routes
app.post('/api/signup', upload.fields([
  { name: 'vendorProfileImage', maxCount: 1 },
  { name: 'kycDocument', maxCount: 1 },
  { name: 'farmingLicense', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Signup request body:', req.body);
    console.log('Signup files:', req.files);

    let userData;
    try {
      userData = JSON.parse(req.body.userData);
      console.log('Parsed user data:', userData);
    } catch (error) {
      console.error('Error parsing userData:', error);
      return res.status(400).json({ error: 'Invalid user data format' });
    }

    const files = req.files || {};

    // Add file paths to user data
    if (files.vendorProfileImage) {
      userData.vendorProfileImage = `/uploads/${files.vendorProfileImage[0].filename}`;
    }
    if (req.files?.kycDocument) {
      vendorData.kycDocument = {
        filename: req.files.kycDocument[0].filename,
        path: req.files.kycDocument[0].path
      };
    }
    if (req.files?.farmingLicense) {
      vendorData.farmingLicense = {
        filename: req.files.farmingLicense[0].filename,
        path: req.files.farmingLicense[0].path
      };
    }

    const vendor = await saveVendor(vendorData);
    console.log('New vendor added:', vendor);
    res.status(201).json(vendor);
  } catch (error) {
    console.error('Error in vendor signup:', error);
    res.status(500).json({ error: 'Failed to create vendor account' });
  }
});

// Client Signup endpoint (MongoDB)
app.post('/api/client/signup', async (req, res) => {
  try {
    const clientData = req.body;
    const client = await saveClient(clientData);
    console.log('New client added:', client);
    res.status(201).json(client);
  } catch (error) {
    console.error('Error in client signup:', error);
    res.status(500).json({ error: 'Failed to create client account' });
  }
});

// Get all users (clients only)
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Get all vendors
app.get('/api/vendors', (req, res) => {
  res.json(vendors);
});

// Get pending vendors
app.get('/api/vendors/pending', async (req, res) => {
  try {
    const vendors = JSON.parse(await fs.promises.readFile(vendorsFilePath, 'utf8'));
    const pendingVendors = vendors.filter(vendor => !vendor.isApproved && vendor.profileCompleted);
    console.log('Pending vendors:', pendingVendors);
    res.json(pendingVendors);
  } catch (error) {
    console.error('Error getting pending vendors:', error);
    res.status(500).json({ error: 'Failed to get pending vendors' });
  }
});

// Approve vendor
app.post('/api/vendors/approve/:id', async (req, res) => {
  try {
    const vendors = JSON.parse(await fs.promises.readFile(vendorsFilePath, 'utf8'));
    const vendorIndex = vendors.findIndex(v => v.id === req.params.id);
    
    if (vendorIndex === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    vendors[vendorIndex].isApproved = true;
    await fs.promises.writeFile(vendorsFilePath, JSON.stringify(vendors, null, 2));
    
    res.json(vendors[vendorIndex]);
  } catch (error) {
    console.error('Error approving vendor:', error);
    res.status(500).json({ error: 'Failed to approve vendor' });
  }
});

// Get user by UID
// Fetch user (client or vendor) by Firebase UID from MongoDB
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // Try to find client
    let user = await User.findOne({ uid }).select('-password -__v');

    // If not a client, try vendor
    if (!user) {
      user = await Vendor.findOne({ uid }).select('-password -__v');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user profile (including email verification status)
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    
    // Check in users (clients)
    const users = JSON.parse(await fs.promises.readFile(usersFilePath, 'utf8'));
    const userIndex = users.findIndex(u => u.uid === uid);
    
    if (userIndex !== -1) {
      // Update user data
      users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
      await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
      
      // Don't send sensitive data
      const { password, ...userData } = users[userIndex];
      return res.json(userData);
    }
    
    // If not found in users, check in vendors
    const vendors = JSON.parse(await fs.promises.readFile(vendorsFilePath, 'utf8'));
    const vendorIndex = vendors.findIndex(v => v.uid === uid);
    
    if (vendorIndex !== -1) {
      // Update vendor data
      vendors[vendorIndex] = { ...vendors[vendorIndex], ...updates, updatedAt: new Date().toISOString() };
      await fs.promises.writeFile(vendorsFilePath, JSON.stringify(vendors, null, 2));
      
      // Don't send sensitive data
      const { password, ...vendorData } = vendors[vendorIndex];
      return res.json(vendorData);
    }
    
    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user data' });
  }
});

// Legacy login-endpoint removed
// app.post('/api/login') removed

// Client signup with Firebase
app.post('/api/client/signup', async (req, res) => {
  try {
    const { email, password, name, phone, uid, emailVerified, address } = req.body;
    
    // Basic validation
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    
    // Initialize users array if file doesn't exist
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      const data = await fs.promises.readFile(usersFilePath, 'utf8');
      users = data ? JSON.parse(data) : [];
    }
    
    // Check if user already exists
    const existingUser = users.find(u => 
      u.email && u.email.toLowerCase() === email.toLowerCase() || 
      (uid && u.uid === uid)
    );
    
    if (existingUser) {
      // If user exists but is not verified, update their verification status
      if (existingUser.uid === uid && emailVerified) {
        existingUser.emailVerified = true;
        existingUser.updatedAt = new Date().toISOString();
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        
        // Don't send password back to client
        const { password: _, ...userData } = existingUser;
        return res.status(200).json({
          message: 'Email verification updated',
          user: userData
        });
      }
      
      return res.status(409).json({ 
        error: 'User already exists',
        code: 'USER_EXISTS',
        email: existingUser.email
      });
    }
    
    // Create new user with all necessary fields
    const now = new Date().toISOString();
    const newUser = {
      id: uid || `user-${Date.now()}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone: (phone || '').trim(),
      address: address || {},
      role: 'client',
      isApproved: true,
      emailVerified: Boolean(emailVerified),
      uid: uid || null,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      isActive: true,
      profileImage: null  // Initialize profile image as null
    };
    
    console.log('Creating new user with data:', JSON.stringify(newUser, null, 2));
      
    // Add password only if it exists (for non-Firebase users)
    if (password) {
      newUser.password = password;
    }
    
    console.log('Creating new user:', JSON.stringify(newUser, null, 2));
    
    // Save to database
    users.push(newUser);
    await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    console.log('User saved successfully');
    
    // Don't send sensitive data back
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'An error occurred during signup',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle email verification callback from Firebase
app.get('/api/verify-email', async (req, res) => {
  try {
    const { uid, email } = req.query;
    
    if (!uid && !email) {
      return res.status(400).send('Missing required parameters');
    }
    
    console.log(`Email verification callback received for UID: ${uid || 'N/A'}, Email: ${email || 'N/A'}`);
    
    // Check in users (clients)
    const users = JSON.parse(await fs.promises.readFile(usersFilePath, 'utf8'));
    let userIndex = -1;
    
    if (uid) {
      userIndex = users.findIndex(u => u.uid === uid);
    } 
    
    if (userIndex === -1 && email) {
      // If not found by UID, try finding by email
      const normalizedEmail = email.toLowerCase().trim();
      userIndex = users.findIndex(u => 
        u.email && u.email.toLowerCase().trim() === normalizedEmail
      );
    }
    
    if (userIndex !== -1) {
      const user = users[userIndex];
      console.log(`Found user at index ${userIndex}, updating email verification status`);
      
      // Update user's email verification status
      user.emailVerified = true;
      user.updatedAt = new Date().toISOString();
      
      // If UID was provided in the callback but not in the user record, update it
      if (uid && !user.uid) {
        user.uid = uid;
        console.log(`Added UID ${uid} to user record`);
      }
      
      try {
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        console.log('Successfully updated users.json with verified email status');
        
        // Redirect to login page with success message
        return res.send(`
          <html>
            <head>
              <title>Email Verified</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background-color: #f5f5f5;
                }
                .success-message { 
                  background: white; 
                  max-width: 500px; 
                  margin: 0 auto; 
                  padding: 30px; 
                  border-radius: 10px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .btn {
                  display: inline-block;
                  margin-top: 20px;
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                }
                .btn:hover {
                  background-color: #45a049;
                }
              </style>
            </head>
            <body>
              <div class="success-message">
                <h2>🎉 Email Verified Successfully!</h2>
                <p>Your email has been verified. You can now log in to your account.</p>
                <a href="/login" class="btn">Go to Login</a>
              </div>
            </body>
          </html>
        `);
      } catch (writeError) {
        console.error('Failed to update users file:', writeError);
        return res.status(500).send('Failed to update verification status');
      }
    }
    
    // If we get here, the user wasn't found
    console.error('User not found for email verification');
    return res.status(404).send('User not found');
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).send('An error occurred during email verification');
  }
});

// Update user profile (including email verification status)
app.put('/api/users/verify-email', async (req, res) => {
  try {
    const { uid, email, emailVerified } = req.body;
    
    if (!uid && !email) {
      return res.status(400).json({ 
        error: 'Either uid or email is required',
        success: false
      });
    }
    
    console.log(`Updating email verification status for UID: ${uid || 'N/A'}, Email: ${email || 'N/A'}, Status: ${emailVerified}`);
    
    // Check in users (clients)
    const users = JSON.parse(await fs.promises.readFile(usersFilePath, 'utf8'));
    let userIndex = -1;
    
    // First try to find by UID if provided
    if (uid) {
      userIndex = users.findIndex(u => u.uid === uid);
      console.log(`Search by UID ${uid}: ${userIndex !== -1 ? 'Found' : 'Not found'}`);
    } 
    
    // If not found by UID, try by email
    if (userIndex === -1 && email) {
      const normalizedEmail = email.toLowerCase().trim();
      userIndex = users.findIndex(u => 
        u.email && u.email.toLowerCase().trim() === normalizedEmail
      );
      console.log(`Search by email ${email}: ${userIndex !== -1 ? 'Found' : 'Not found'}`);
    }
    
    if (userIndex !== -1) {
      const user = users[userIndex];
      console.log(`Found user at index ${userIndex}, current emailVerified: ${user.emailVerified}`);
      
      // Update user's email verification status
      const previousStatus = user.emailVerified;
      user.emailVerified = emailVerified !== undefined ? emailVerified : true;
      user.updatedAt = new Date().toISOString();
      
      // If UID was provided in the request but not in the user record, update it
      if (uid && !user.uid) {
        user.uid = uid;
        console.log(`Added UID ${uid} to user record`);
      }
      
      console.log(`Updated email verification status from ${previousStatus} to ${user.emailVerified}`);
      
      try {
        // Save the updated users array
        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
        console.log('Successfully updated users.json');
        
        // Read back to verify
        const updatedUsers = JSON.parse(await fs.promises.readFile(usersFilePath, 'utf8'));
        const updatedUser = updatedUsers[userIndex];
        
        if (!updatedUser) {
          console.error('Failed to find updated user after save');
          return res.status(500).json({
            success: false,
            error: 'Failed to verify update',
            updated: false
          });
        }
        
        console.log('Verification status after save:', {
          id: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          updatedAt: updatedUser.updatedAt
        });
        
        // Don't send sensitive data
        const { password, ...userData } = updatedUser;
        
        return res.json({ 
          success: true,
          message: 'Email verification status updated successfully',
          user: userData,
          updated: true
        });
        
      } catch (writeError) {
        console.error('Failed to update users file:', writeError);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update user verification status',
          details: process.env.NODE_ENV === 'development' ? writeError.message : undefined,
          updated: false
        });
      }
    }
    
    console.log('User not found in users.json, checking vendors...');
    
    // If not found in users, check in vendors
    const vendors = JSON.parse(await fs.promises.readFile(vendorsFilePath, 'utf8'));
    const vendorIndex = vendors.findIndex(v => v.uid === uid);
    
    if (vendorIndex !== -1) {
      console.log(`Found vendor at index ${vendorIndex}, updating email verification status`);
      
      // Update vendor's email verification status
      vendors[vendorIndex].emailVerified = true;
      vendors[vendorIndex].updatedAt = new Date().toISOString();
      
      await fs.promises.writeFile(vendorsFilePath, JSON.stringify(vendors, null, 2));
      console.log('Updated vendors.json with verified email status');
      
      // Don't send sensitive data
      const { password: vendorPassword, ...vendorData } = vendors[vendorIndex];
      console.log('Returning vendor data:', JSON.stringify(vendorData, null, 2));
      
      return res.json({ 
        message: 'Email verified successfully',
        user: vendorData 
      });
    }
    
    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});