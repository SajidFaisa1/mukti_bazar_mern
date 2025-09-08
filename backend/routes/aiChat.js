const express = require('express');
const AIFarmingChatbot = require('../services/aiChatbotService');
const ChatHistory = require('../models/ChatHistory');
const DetectionHistory = require('../models/DetectionHistory');
const auth = require('../middleware/auth');
const router = express.Router();

// Initialize AI chatbot service
const aiChatbot = new AIFarmingChatbot();

// Optional auth middleware - extracts user if token provided but doesn't require it
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
    } catch (error) {
      // Invalid token, continue without user info
      console.log('Optional auth: Invalid token provided');
    }
  }
  next();
};

/**
 * POST /api/chat
 * Enhanced chat endpoint for smartChatbotService with context support
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { messages, userId, userRole = 'client', contextData, detectionContext } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Messages array is required' 
      });
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || !userMessage.content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid user message is required' 
      });
    }

    // Use authenticated user ID if available, otherwise fall back to request body
    const actualUserId = req.user?.id || userId;
    
    // Generate session ID if not provided
    const sessionId = req.headers['x-session-id'] || actualUserId || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Build context for AI response
    let contextualMessage = userMessage.content;
    
    // Add detection context if provided
    if (detectionContext) {
      const plant = detectionContext.prediction?.plant || 'unknown';
      const disease = detectionContext.prediction?.disease || 'unknown';
      const isHealthy = detectionContext.prediction?.is_healthy;
      const confidence = detectionContext.prediction?.confidence;
      
      contextualMessage = `Plant Detection Context: ${plant} - ${disease} (${isHealthy ? 'healthy' : 'diseased'}, confidence: ${(confidence * 100).toFixed(1)}%)\n\nUser Question: ${userMessage.content}`;
    }

    // Get AI response with enhanced context
    const aiResponse = await aiChatbot.generateResponse(contextualMessage, userRole, detectionContext);
    
    // Save conversation to database
    try {
      // Find existing chat session or create new one
      let chatSession = await ChatHistory.findOne({ sessionId });
      
      if (!chatSession) {
        // Create new chat session
        chatSession = new ChatHistory({
          userId: actualUserId || null,
          sessionId: sessionId,
          userRole: req.user?.role || userRole,
          detectionContext: detectionContext || null,
          messages: []
        });
        
        // Link to detection if context provided
        if (detectionContext && detectionContext.detectionId) {
          chatSession.detectionId = detectionContext.detectionId;
          
          // Update detection record with chat reference
          await DetectionHistory.findByIdAndUpdate(
            detectionContext.detectionId,
            { $push: { chatSessions: chatSession._id } }
          );
        }
      }
      
      // Add user message
      chatSession.messages.push({
        role: 'user',
        content: userMessage.content,
        timestamp: new Date()
      });
      
      // Add assistant response
      chatSession.messages.push({
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date(),
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          hasDetectionContext: !!detectionContext
        }
      });
      
      // Extract topics and save
      chatSession.extractTopics();
      await chatSession.save();
      
      console.log(`Chat conversation saved for session: ${sessionId}`);
      
    } catch (dbError) {
      console.error('Error saving chat to database:', dbError);
      // Continue with response even if DB save fails
    }

    res.json({
      success: true,
      response: aiResponse.response,
      confidence: 0.8, // Default confidence
      suggestions: [], // Could add contextual suggestions here
      metadata: {
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        userRole,
        hasDetectionContext: !!detectionContext,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Enhanced AI Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process chat message' 
    });
  }
});

/**
 * POST /api/chat/message
 * Send a message to AI chatbot and get intelligent response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, userRole = 'client', uid } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    // Get AI response
    const aiResponse = await aiChatbot.generateResponse(message, userRole);
    
    // Optional: Save conversation to database for analytics
    // await saveConversation(uid, message, aiResponse.response, userRole);

    res.json({
      success: true,
      message: aiResponse.response,
      metadata: {
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        userRole,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process message' 
    });
  }
});

/**
 * GET /api/chat/history
 * Get chat history for a user or session
 */
router.get('/history', optionalAuth, async (req, res) => {
  try {
    const { userId, sessionId, limit = 20, page = 1 } = req.query;
    
    let query = {};
    // Use authenticated user ID if available, otherwise fall back to query parameter
    const actualUserId = req.user?.id || userId;
    if (actualUserId) query.userId = actualUserId;
    if (sessionId) query.sessionId = sessionId;
    
    const skip = (page - 1) * limit;
    
    const chatHistory = await ChatHistory.find(query)
      .populate('detectionId', 'prediction disease_info recommendation timestamp')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await ChatHistory.countDocuments(query);
    
    res.json({
      success: true,
      history: chatHistory,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

/**
 * GET /api/chat/session/:sessionId
 * Get specific chat session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const chatSession = await ChatHistory.findOne({ sessionId })
      .populate('detectionId', 'prediction disease_info recommendation timestamp');
    
    if (!chatSession) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    res.json({
      success: true,
      session: chatSession
    });
    
  } catch (error) {
    console.error('Chat session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat session'
    });
  }
});
router.get('/status', async (req, res) => {
  try {
    const ollamaAvailable = await aiChatbot.checkOllamaStatus();
    const models = await aiChatbot.getAvailableModels();
    
    res.json({
      success: true,
      services: {
        ollama: {
          available: ollamaAvailable,
          models: models.length,
          modelNames: models.map(m => m.name)
        }
      },
      fallback: !ollamaAvailable ? 'rule-based' : null
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check status' 
    });
  }
});

/**
 * GET /api/chat/suggestions
 * Get contextual suggestions based on user role
 */
router.get('/suggestions', (req, res) => {
  const { userRole = 'client' } = req.query;
  
  const suggestions = {
    client: [
      "কিভাবে পণ্যের দাম নিয়ে আলোচনা করবো? (How to negotiate prices?)",
      "What is the bartering system?",
      "How to find genuine farmers?",
      "Minimum order quantities কেমন? (What are minimum order quantities?)",
      "Delivery options এবং cost কি? (What are delivery options and costs?)"
    ],
    vendor: [
      "How to complete vendor verification?",
      "আমার পণ্য approve হতে কত সময় লাগবে? (How long for product approval?)",
      "How to create barter offers?",
      "Bulk messaging কিভাবে করবো? (How to send bulk messages?)",
      "Plant disease detection কিভাবে কাজ করে? (How does plant disease detection work?)"
    ],
    admin: [
      "How to verify vendor documents?",
      "Large order approval process",
      "How to monitor for hoarding/syndicate activity?",
      "Platform analytics and reporting",
      "Managing featured products"
    ]
  };

  res.json({
    success: true,
    suggestions: suggestions[userRole] || suggestions.client,
    userRole
  });
});

/**
 * POST /api/chat/feedback
 * Collect feedback on AI responses for improvement
 */
router.post('/feedback', async (req, res) => {
  try {
    const { conversationId, rating, feedback, uid } = req.body;
    
    // Save feedback for model improvement
    console.log('AI Feedback received:', { conversationId, rating, feedback, uid });
    
    res.json({
      success: true,
      message: 'Feedback received. ধন্যবাদ! (Thank you!)'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save feedback' 
    });
  }
});

module.exports = router;
