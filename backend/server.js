// ------------------------------
// Express API MAIN ENTRY (clean)
// All heavy logic now exists inside individual routers.
// The previous monolithic implementation was moved to legacyServer.js
// ------------------------------
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Connect to MongoDB
require('./config/db');

// Routers
const vendorRoutes  = require('./routes/vendor');
const userRoutes    = require('./routes/user');
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const productRoutes = require('./routes/products');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Mount routers
app.use('/api/vendors',  vendorRoutes);
app.use('/api/clients',  userRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);

// Quick 410 for very old endpoints we deliberately removed
['/api/vendor/signup', '/api/client/signup'].forEach(path => {
  app.all(path, (_, res) => {
    res.status(410).json({ error: 'Deprecated endpoint. Please use the updated API routes.' });
  });
});

// 404 fallback
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
