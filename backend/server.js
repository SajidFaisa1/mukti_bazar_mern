// ------------------------------
// Express API MAIN ENTRY (clean)
// All heavy logic now exists inside individual routers.
// The previous monolithic implementation was moved to legacyServer.js
// ------------------------------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const autoExpiryService = require('./services/autoExpiryService');

// Connect to MongoDB
require('./config/db');

// Routers
const vendorRoutes  = require('./routes/vendor');
const userRoutes    = require('./routes/user');
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const productRoutes = require('./routes/products');
const addressRoutes = require('./routes/address');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/order');
const paymentRoutes = require('./routes/payment');
const barterRoutes  = require('./routes/barter');
const messageRoutes = require('./routes/messages');
const groupRoutes   = require('./routes/groups');
const negotiationRoutes = require('./routes/negotiation');
const notificationRoutes = require('./routes/notification');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/notifications'
});

// Global WebSocket connections map
global.notificationWS = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const uid = query.uid;
  
  console.log(`🔌 WebSocket connection attempt for user: ${uid}`);
  
  if (!uid) {
    console.log('❌ WebSocket connection rejected: No UID provided');
    ws.close(1008, 'UID required');
    return;
  }
  
  console.log(`✅ Notification WebSocket connected for user: ${uid}`);
  global.notificationWS.set(uid, ws);
  
  ws.on('close', () => {
    console.log(`Notification WebSocket disconnected for user: ${uid}`);
    global.notificationWS.delete(uid);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${uid}:`, error);
    global.notificationWS.delete(uid);
  });
  
  // Send ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Mount routers
app.use('/api/vendors',  vendorRoutes);
app.use('/api/clients',  userRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/barter', barterRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/notifications', notificationRoutes);

// Quick 410 for very old endpoints we deliberately removed
['/api/vendor/signup', '/api/client/signup'].forEach(path => {
  app.all(path, (_, res) => {
    res.status(410).json({ error: 'Deprecated endpoint. Please use the updated API routes.' });
  });
});

// 404 fallback
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/notifications`);
  
  // Start auto-expiry service
  autoExpiryService.start();
});
