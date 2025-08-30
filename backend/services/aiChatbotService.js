const fs = require('fs');
const path = require('path');

/**
 * FREE AI Chatbot Service for Mukti Bazar
 * Uses Ollama (local LLM) for intelligent customer service
 */

class AIFarmingChatbot {
  constructor() {
    this.projectContext = this.loadProjectContext();
    this.ollamaUrl = 'http://localhost:11434'; // Default Ollama URL
    this.model = 'llama3.2:3b'; // Lightweight, fast model
  }

  /**
   * Load project context from your models and documentation
   */
  loadProjectContext() {
    return {
      projectName: "Mukti Bazar",
      mission: "Breaking agricultural syndicate in Bangladesh through direct farmer-to-retailer connections",
      userTypes: {
        client: "Shop owners who buy agricultural products in bulk",
        vendor: "Farmers/producers who sell agricultural products",
        admin: "Platform administrators who verify vendors and monitor large orders"
      },
      uniqueFeatures: [
        "Bartering system between vendors",
        "Price negotiation system", 
        "Admin approval for large orders to prevent hoarding",
        "Vendor verification system with KYC documents",
        "Plant disease detection using AI",
        "Bulk messaging for farmers"
      ],
      products: "Agricultural products only - crops, seeds, fertilizers, livestock feed, etc.",
      paymentMethods: ["Cash on Delivery", "SSLCommerz", "Mobile Banking"],
      antiSyndicateFeatures: [
        "Vendor must complete profile with farming license/trade license",
        "Admin approves vendors after document verification",
        "Admin approves products before they go live",
        "Large quantity orders need admin approval",
        "Direct farmer-to-shop owner connection"
      ]
    };
  }

  /**
   * Generate context-aware response using Ollama
   */
  async generateResponse(userMessage, userRole = 'client') {
    const systemPrompt = this.buildSystemPrompt(userRole);
    
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        response: data.response,
        model: this.model,
        tokens: data.eval_count || 0
      };

    } catch (error) {
      console.error('Ollama API error:', error);
      // Fallback to rule-based responses
      return this.getRuleBasedResponse(userMessage, userRole);
    }
  }

  /**
   * Build system prompt based on user role and project context
   */
  buildSystemPrompt(userRole) {
    return `You are an intelligent customer service assistant for Mukti Bazar, a revolutionary agricultural e-commerce platform in Bangladesh.

MISSION: Help break agricultural syndicates by connecting farmers directly with shop owners, eliminating middlemen who artificially increase prices.

PROJECT CONTEXT:
- Platform: ${this.projectContext.projectName}
- Users: ${Object.keys(this.projectContext.userTypes).join(', ')}
- Current user type: ${userRole}
- Products: Only agricultural products (crops, seeds, fertilizers, livestock feed, etc.)
- Language: Mix of English and Bengali (Bangladesh context)

KEY FEATURES TO EXPLAIN:
1. BARTERING SYSTEM: Vendors can exchange products with each other
2. NEGOTIATION: Clients can negotiate prices with vendors through messaging
3. BULK ORDERING: Minimum quantities set by vendors, wholesale focus
4. ANTI-SYNDICATE MEASURES:
   - Vendor verification with farming licenses
   - Admin approval for vendors and products
   - Large order monitoring to prevent hoarding
5. PLANT DISEASE DETECTION: AI-powered crop disease identification
6. DIRECT CONNECTION: No middlemen, farmers sell directly to shop owners

RESPONSE GUIDELINES:
- Be helpful and professional
- Use simple language (many users are farmers)
- Include Bengali phrases when appropriate
- Focus on agricultural context
- Explain features that help fight syndicate pricing
- If asked about products not related to agriculture, politely redirect
- For technical issues, guide users to contact support

Current user role: ${userRole}
${this.getUserRoleGuidance(userRole)}`;
  }

  /**
   * Get role-specific guidance
   */
  getUserRoleGuidance(userRole) {
    const guidance = {
      client: `
USER ROLE CONTEXT: You're helping a shop owner who buys agricultural products in bulk.
- Help them find products, understand minimum quantities
- Explain negotiation and bulk ordering process
- Guide them through vendor communication
- Explain delivery options and payment methods`,
      
      vendor: `
USER ROLE CONTEXT: You're helping a farmer/producer who sells agricultural products.
- Help them understand product approval process
- Guide through profile completion and document verification
- Explain bartering system with other vendors
- Help with product listing and pricing`,
      
      admin: `
USER ROLE CONTEXT: You're helping an administrator who monitors the platform.
- Focus on vendor verification process
- Explain large order approval workflow
- Help with platform moderation features
- Guide through analytics and reporting`
    };

    return guidance[userRole] || guidance.client;
  }

  /**
   * Fallback rule-based responses when Ollama is not available
   */
  getRuleBasedResponse(message, userRole) {
    const lowerMessage = message.toLowerCase();
    
    // Common questions with Bengali phrases
    const responses = {
      greeting: [
        "আসসালামু আলাইকুম! Welcome to Mukti Bazar! আমি কিভাবে আপনাকে সাহায্য করতে পারি? (How can I help you?)",
        "Hello! I'm here to help you with Mukti Bazar. What would you like to know about our agricultural marketplace?"
      ],
      
      bartering: [
        "Our bartering system allows vendors to exchange products directly! For example, a rice farmer can trade rice for fertilizer with another vendor. This helps farmers get what they need without spending cash. Would you like to know how to create a barter offer?"
      ],
      
      antiSyndicate: [
        "Mukti Bazar fights agricultural syndicates by: 1) Direct farmer-to-shop connections (no middlemen), 2) Vendor verification with proper documents, 3) Admin monitoring of large orders to prevent hoarding, 4) Transparent pricing. This ensures fair prices for both farmers and shop owners!"
      ],
      
      verification: [
        "All vendors must complete profile verification with: KYC documents, NID photo, Trade License or farming license, personal photo, and location details. This ensures only genuine farmers can sell on our platform."
      ]
    };

    // Simple keyword matching
    if (lowerMessage.includes('barter')) return { success: true, response: responses.bartering[0] };
    if (lowerMessage.includes('syndicate') || lowerMessage.includes('middleman')) return { success: true, response: responses.antiSyndicate[0] };
    if (lowerMessage.includes('verification') || lowerMessage.includes('approve')) return { success: true, response: responses.verification[0] };
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('assalam')) {
      return { success: true, response: responses.greeting[Math.floor(Math.random() * responses.greeting.length)] };
    }

    // Default response
    return {
      success: true,
      response: "I'm here to help with Mukti Bazar! You can ask me about our bartering system, price negotiation, vendor verification, bulk ordering, or how we're fighting agricultural syndicates. কি জানতে চান? (What would you like to know?)"
    };
  }

  /**
   * Check if Ollama is running
   */
  async checkOllamaStatus() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/version`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models || [];
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
    return [];
  }
}

module.exports = AIFarmingChatbot;
