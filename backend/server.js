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
const groupSchedulerService = require('./services/groupSchedulerService');

// Connect to MongoDB
require('./config/db');

// Routers
const vendorRoutes  = require('./routes/vendor');
const userRoutes    = require('./routes/user');
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const adminPanelRoutes = require('./routes/adminPanel');
const fraudTestingRoutes = require('./routes/fraudTesting');
const debugFraudRoutes = require('./routes/debugFraud');
const productRoutes = require('./routes/products');
const addressRoutes = require('./routes/address');
const cartRoutes    = require('./routes/cart');
const orderRoutes   = require('./routes/order');
const paymentRoutes = require('./routes/payment');
const barterRoutes  = require('./routes/barter');
const messageRoutes = require('./routes/messages');
const groupRoutes   = require('./routes/groups');
const groupAnnouncementRoutes = require('./routes/groupAnnouncements');
const aiChatRoutes = require('./routes/aiChat');
const bulkMessageRoutes = require('./routes/bulkMessages');
const negotiationRoutes = require('./routes/negotiation');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notification');
const plantDiseaseRoutes = require('./routes/plantDisease');
const userModerationRoutes = require('./routes/userModeration');
const homeSummaryRoutes = require('./routes/homeSummary');
const agricultureRoutes = require('./routes/agriculture');
const feedbackRoutes = require('./routes/feedback');
const monitoringRoutes = require('./routes/monitoring');
const analyticsRoutes = require('./routes/analytics');
const responsesRoutes = require('./routes/responses');
const inventoryRoutes = require('./routes/inventory');
const adminManagementRoutes = require('./routes/adminManagement');
const communicationRoutes = require('./routes/communication');
const { adminRouter: adminCommunicationRoutes, publicRouter: publicCommunicationRoutes } = communicationRoutes;
const financialRoutes = require('./routes/financial');
const advancedUserManagementRoutes = require('./routes/advancedUserManagement');
const contentProductManagementRoutes = require('./routes/contentProductManagement');
const systemConfigurationRoutes = require('./routes/systemConfiguration');
const realTimeMonitoringRoutes = require('./routes/realTimeMonitoring');
const realTimeAnalyticsRoutes = require('./routes/realTimeAnalytics');

const app = express();
// Middleware: request id & logging early
const requestId = require('./middleware/requestId');
const logRequests = require('./middleware/logRequests');
const metricsRecorder = require('./middleware/metricsRecorder');
app.use(requestId);
app.use(logRequests);
app.use(metricsRecorder);
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
  
  if (!uid) {
    ws.close(1008, 'UID required');
    return;
  }
  
  global.notificationWS.set(uid, ws);
  
  ws.on('close', () => {
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
// Health & metrics endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  const { metricsText, enabled } = require('./services/metrics');
  try {
    const out = await metricsText();
    res.setHeader('Content-Type', enabled ? 'text/plain; version=0.0.4' : 'text/plain');
    res.send(out);
  } catch (e) {
    res.status(500).send('# metrics error');
  }
});
app.use(cors());

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Mount routers
app.use('/api/vendors',  vendorRoutes);
app.use('/api/clients',  userRoutes);
app.use('/api/users',    userRoutes); // Additional mapping for admin panel
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/admin-panel', adminPanelRoutes);
app.use('/api/fraud-testing', fraudTestingRoutes);
app.use('/api/debug-fraud', debugFraudRoutes);
app.use('/api/products', productRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/barter', barterRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', groupAnnouncementRoutes);
app.use('/api/bulk-messages', bulkMessageRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/plant-disease', plantDiseaseRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/chat', aiChatRoutes);
app.use('/api/user-moderation', userModerationRoutes);
app.use('/api/home', homeSummaryRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/agriculture', agricultureRoutes);
app.use('/api/admin/monitoring', monitoringRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/responses', responsesRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/management', adminManagementRoutes);
app.use('/api/admin/communication', adminCommunicationRoutes);
app.use('/api/communication', publicCommunicationRoutes); // Public routes
app.use('/api/admin/financial', financialRoutes);
app.use('/api/admin', advancedUserManagementRoutes);
app.use('/api/admin', contentProductManagementRoutes);
app.use('/api/admin', systemConfigurationRoutes);
app.use('/api/admin', realTimeMonitoringRoutes);
app.use('/api/admin', realTimeAnalyticsRoutes);

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
  
  // Start group scheduler service
  groupSchedulerService.start();
});
