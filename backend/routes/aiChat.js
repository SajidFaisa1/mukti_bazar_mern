const express = require('express');
const AIFarmingChatbot = require('../services/aiChatbotService');
const router = express.Router();

// Initialize AI chatbot service
const aiChatbot = new AIFarmingChatbot();

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
 * GET /api/chat/status
 * Check if AI service is available
 */
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
