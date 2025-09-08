const fs = require('fs');
const path = require('path');

/**
 * FREE AI Chatbot Service for Mukti Bazar
 * Uses Ollama (local LLM) for intelligent customer service
 */

class AIFarmingChatbot {
  constructor() {
    this.projectContext = this.loadProjectContext();
    // Allow override via environment variables
    this.ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    // Prefer small fast model first; will auto‑verify (can be overridden by env)
    this.modelCandidates = [
      'llama3.1:3b',
      'llama3.1:8b',
      'mistral:7b',
      'phi3:mini'
    ];
    this.model = this.modelCandidates[0];
    const envModel = process.env.OLLAMA_MODEL;
    if (envModel) {
      this.model = envModel;
      // Put env model at front of candidates list without duplication
      this.modelCandidates = [envModel, ...this.modelCandidates.filter(m => m !== envModel)];
    }
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
   * Ensure preferred model is available, fallback to others if not
   */
  async ensureModel() {
    try {
      const tagsRes = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!tagsRes.ok) return false;
      const data = await tagsRes.json();
      const available = (data.models || []).map(m => m.name);
      if (!available.includes(this.model)) {
        // Pick first candidate that exists
        const found = this.modelCandidates.find(c => available.includes(c));
        if (found) {
          this.model = found;
          return true;
        }
        // Attempt to pull preferred model (may stream chunks)
        const pullRes = await fetch(`${this.ollamaUrl}/api/pull`, {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.model })
        });
        if (!pullRes.ok) return false;
        return true;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate context-aware response using Ollama with optional detection context
   */
  async generateResponse(userMessage, userRole = 'client', detectionContext = null) {
    const systemPrompt = this.buildSystemPrompt(userRole, detectionContext);
    const modelReady = await this.ensureModel();
    if (!modelReady) {
      console.warn('Ollama model not ready; using fallback.');
      return this.getRuleBasedResponse(userMessage, userRole, detectionContext);
    }
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`,
          stream: false,
          options: { temperature: 0.7, top_p: 0.9, max_tokens: 500 }
        })
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Model '${this.model}' not found (404). Pull it: ollama pull ${this.model}`);
        }
        throw new Error(`Ollama API error: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, response: data.response, model: this.model, tokens: data.eval_count || 0 };
    } catch (error) {
      console.error('Ollama API error:', error.message || error);
      return this.getRuleBasedResponse(userMessage, userRole, detectionContext);
    }
  }

  /**
   * Build system prompt based on user role and project context
   */
  buildSystemPrompt(userRole, detectionContext = null) {
    let basePrompt = `You are an intelligent customer service assistant for Mukti Bazar, a revolutionary agricultural e-commerce platform in Bangladesh.

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

    // Add plant disease detection context if provided
    if (detectionContext) {
      const plant = detectionContext.prediction?.plant?.replace(/_/g, ' ') || 'unknown plant';
      const disease = detectionContext.prediction?.disease?.replace(/_/g, ' ') || 'unknown condition';
      const isHealthy = detectionContext.prediction?.is_healthy;
      const confidence = detectionContext.prediction?.confidence;
      const severity = detectionContext.disease_info?.severity;
      const treatment = detectionContext.disease_info?.treatment;
      const prevention = detectionContext.disease_info?.prevention;
      
      basePrompt += `

CURRENT PLANT DIAGNOSIS CONTEXT:
- Plant Type: ${plant}
- Condition: ${disease}
- Health Status: ${isHealthy ? 'Healthy' : 'Disease Detected'}
- Detection Confidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}
${severity ? `- Disease Severity: ${severity}` : ''}
${treatment ? `- Recommended Treatment: ${treatment}` : ''}
${prevention ? `- Prevention Measures: ${prevention}` : ''}

IMPORTANT: Use this specific diagnosis information to provide targeted advice. Don't give generic responses - focus on the actual detected condition and provide specific guidance based on the diagnosis results.`;
    }

    return basePrompt;
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
  getRuleBasedResponse(message, userRole, detectionContext = null) {
    const lowerMessage = message.toLowerCase();
    
    // Handle plant disease detection context first
    if (detectionContext) {
      const plant = detectionContext.prediction?.plant?.replace(/_/g, ' ') || 'plant';
      const disease = detectionContext.prediction?.disease?.replace(/_/g, ' ') || 'condition';
      const isHealthy = detectionContext.prediction?.is_healthy;
      const treatment = detectionContext.disease_info?.treatment;
      const prevention = detectionContext.disease_info?.prevention;
      const severity = detectionContext.disease_info?.severity;
      
      // Treatment-related questions
      if (lowerMessage.includes('treat') || lowerMessage.includes('cure') || lowerMessage.includes('medicine')) {
        if (isHealthy) {
          return {
            success: true,
            response: `Great news! Your ${plant} is healthy. To maintain its health: 1) Continue regular watering and proper fertilization, 2) Monitor for early signs of disease, 3) Ensure good air circulation, 4) Remove any fallen leaves promptly. Keep up the good care! আপনার গাছ সুস্থ আছে! (Your plant is healthy!)`
          };
        } else {
          let response = `For ${disease} in your ${plant}: `;
          if (treatment) {
            response += treatment;
          } else {
            response += "Apply appropriate fungicide treatment, remove affected leaves, and improve air circulation around the plant.";
          }
          if (severity) {
            response += ` This is a ${severity.toLowerCase()} severity condition.`;
          }
          response += " Monitor the plant closely and repeat treatment if necessary.";
          return { success: true, response };
        }
      }
      
      // Prevention questions
      if (lowerMessage.includes('prevent') || lowerMessage.includes('avoid') || lowerMessage.includes('future')) {
        let response = `To prevent ${disease} in your ${plant}: `;
        if (prevention) {
          response += prevention;
        } else {
          response += "Maintain proper plant spacing, avoid overhead watering, ensure good drainage, and practice crop rotation.";
        }
        response += " Regular monitoring and early intervention are key to preventing disease spread.";
        return { success: true, response };
      }
      
      // Cause questions
      if (lowerMessage.includes('cause') || lowerMessage.includes('why') || lowerMessage.includes('reason')) {
        if (isHealthy) {
          return {
            success: true,
            response: `Your ${plant} is healthy! Good growing conditions, proper care, and favorable weather contribute to plant health. Continue your current care routine.`
          };
        } else {
          return {
            success: true,
            response: `${disease} in ${plant} is typically caused by fungal infection, often due to high humidity, poor air circulation, or wet conditions. Environmental stress, overcrowding, and poor drainage can make plants more susceptible.`
          };
        }
      }
    }
    
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
