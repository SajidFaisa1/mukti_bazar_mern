import axios from 'axios';

const API_URL = 'http://localhost:5005/api';

class SmartChatbotService {
  constructor() {
    this.chatHistory = new Map();
    this.userContext = new Map();
    this.productData = new Map();
  }

  // Initialize user context with their data
  async initializeUserContext(userId, userData) {
    try {
      // Fetch user's recent orders, cart, browsing history
      const [orders, cart, favorites] = await Promise.all([
        this.fetchUserOrders(userId),
        this.fetchUserCart(userId),
        this.fetchUserFavorites(userId)
      ]);

      this.userContext.set(userId, {
        ...userData,
        recentOrders: orders,
        cartItems: cart,
        favorites: favorites,
        lastActivity: new Date(),
        preferences: this.analyzeUserPreferences(orders, favorites)
      });
    } catch (error) {
      console.error('Error initializing user context:', error);
    }
  }

  // Smart system prompt that understands your marketplace
  generateSystemPrompt(userContext) {
    const basePrompt = `You are an intelligent customer service assistant for Mukti Bazar, Bangladesh's leading agricultural marketplace. You help users with:

MARKETPLACE KNOWLEDGE:
- Mukti Bazar connects farmers/producers (vendors) directly with shop owners/retailers (clients)
- We focus on wholesale agricultural products to break farming syndicates
- Products include: vegetables, fruits, seeds, fertilizers, animal feed, farming equipment
- We have a bartering system where vendors can exchange products
- Price negotiation is available between clients and vendors
- All vendors are verified through KYC documents and admin approval

YOUR CAPABILITIES:
1. 🛒 SHOPPING ASSISTANCE:
   - Product recommendations based on user history
   - Price comparisons and deal alerts
   - Stock availability checks
   - Bulk quantity calculations

2. 🏪 VENDOR INFORMATION:
   - Vendor ratings and reviews
   - Location-based vendor matching
   - Vendor specialties and certifications

3. 📦 ORDER SUPPORT:
   - Order tracking and status updates
   - Delivery information
   - Return and refund policies

4. 💰 PAYMENT & PRICING:
   - Payment methods (SSLCommerz integration)
   - Bulk pricing calculations
   - Negotiation guidance

5. 🌱 AGRICULTURAL EXPERTISE:
   - Crop recommendations for Bangladesh climate
   - Seasonal availability
   - Storage and handling tips
   - Plant disease identification (we have AI detection)

6. 🔄 BARTER SYSTEM:
   - How bartering works
   - Finding barter partners
   - Exchange value calculations

RESPONSE GUIDELINES:
- Always be helpful, professional, and knowledgeable
- Respond in Bangla when user prefers it
- Provide specific, actionable information
- If you don't know something, admit it and suggest contacting human support
- Always consider the user's context and history when responding`;

    if (userContext) {
      const contextAddition = `

CURRENT USER CONTEXT:
- User Role: ${userContext.role || 'Client'}
- Location: ${userContext.location || 'Not specified'}
- Recent Activity: ${userContext.lastActivity}
- Cart Items: ${userContext.cartItems?.length || 0} items
- Favorite Categories: ${userContext.preferences?.categories?.join(', ') || 'None'}
- Recent Orders: ${userContext.recentOrders?.length || 0} orders`;

      return basePrompt + contextAddition;
    }

    return basePrompt;
  }

  // Enhanced chat response with context awareness
  async getChatResponse(userId, message, userRole = 'client') {
    try {
      // Get user context
      let userContext = this.userContext.get(userId);
      if (!userContext) {
        // Initialize basic context
        userContext = { role: userRole, lastActivity: new Date() };
        this.userContext.set(userId, userContext);
      }

      // Get chat history
      let history = this.chatHistory.get(userId) || [];
      history.push({ role: 'user', content: message });

      // Check if user is asking about products
      const productQuery = await this.detectProductQuery(message);
      let productContext = '';
      
      if (productQuery.isProductQuery) {
        const products = await this.searchProducts(productQuery.keywords);
        productContext = this.formatProductContext(products);
      }

      // Prepare enhanced system prompt
      const systemPrompt = this.generateSystemPrompt(userContext);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(productContext ? [{ role: 'system', content: `RELEVANT PRODUCTS:\n${productContext}` }] : []),
        ...history.slice(-10) // Keep last 10 messages for context
      ];

      // Call your existing chat API
      const response = await axios.post(`${API_URL}/chat`, { 
        messages,
        userId,
        userRole,
        contextData: userContext
      });

      if (response.data?.success) {
        const aiResponse = response.data.response;
        history.push({ role: 'assistant', content: aiResponse });
        this.chatHistory.set(userId, history);
        
        // Update user activity
        userContext.lastActivity = new Date();
        this.userContext.set(userId, userContext);

        return {
          response: aiResponse,
          confidence: response.data.confidence || 0.8,
          suggestions: response.data.suggestions || [],
          relatedProducts: productQuery.isProductQuery ? await this.searchProducts(productQuery.keywords, 3) : []
        };
      } else {
        throw new Error(response.data?.error || 'AI service error');
      }

    } catch (error) {
      console.error('Smart chatbot error:', error);
      return {
        response: "I'm having trouble right now. Please try again or contact our support team.",
        confidence: 0,
        suggestions: ['Try rephrasing your question', 'Contact human support'],
        relatedProducts: []
      };
    }
  }

  // Detect if user is asking about products
  async detectProductQuery(message) {
    const productKeywords = [
      'rice', 'wheat', 'potato', 'tomato', 'onion', 'garlic', 'corn', 'jute',
      'fertilizer', 'seeds', 'pesticide', 'feed', 'equipment', 'machinery',
      'price', 'cost', 'buy', 'sell', 'available', 'stock', 'vendor', 'farmer'
    ];

    const bengaliKeywords = [
      'চাল', 'গম', 'আলু', 'টমেটো', 'পিয়াজ', 'রসুন', 'ভুট্টা', 'পাট',
      'সার', 'বীজ', 'কীটনাশক', 'খাদ্য', 'যন্ত্রপাতি', 'দাম', 'কিনতে', 'বিক্রি'
    ];

    const allKeywords = [...productKeywords, ...bengaliKeywords];
    const foundKeywords = allKeywords.filter(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      isProductQuery: foundKeywords.length > 0,
      keywords: foundKeywords,
      confidence: foundKeywords.length / allKeywords.length
    };
  }

  // Search products for context
  async searchProducts(keywords, limit = 10) {
    try {
      const response = await axios.get(`${API_URL}/products/search`, {
        params: {
          q: keywords.join(' '),
          limit
        }
      });
      return response.data.products || [];
    } catch (error) {
      console.error('Product search error:', error);
      return [];
    }
  }

  // Format product information for AI context
  formatProductContext(products) {
    if (!products.length) return '';

    return products.map(product => 
      `Product: ${product.name}
       Price: ৳${product.unitPrice || product.offerPrice}/${product.unitType}
       Vendor: ${product.vendorName || 'N/A'}
       Stock: ${product.totalQty || 'N/A'}
       Category: ${product.category}
       Location: ${product.location || 'N/A'}`
    ).join('\n---\n');
  }

  // Analyze user preferences from history
  analyzeUserPreferences(orders, favorites) {
    const categories = new Set();
    const vendors = new Set();
    
    [...(orders || []), ...(favorites || [])].forEach(item => {
      if (item.category) categories.add(item.category);
      if (item.vendorName) vendors.add(item.vendorName);
    });

    return {
      categories: Array.from(categories),
      preferredVendors: Array.from(vendors)
    };
  }

  // Helper methods to fetch user data
  async fetchUserOrders(userId) {
    try {
      const response = await axios.get(`${API_URL}/orders/user/${userId}`);
      return response.data.orders || [];
    } catch (error) {
      return [];
    }
  }

  async fetchUserCart(userId) {
    try {
      const response = await axios.get(`${API_URL}/cart/${userId}`);
      return response.data.items || [];
    } catch (error) {
      return [];
    }
  }

  async fetchUserFavorites(userId) {
    try {
      const response = await axios.get(`${API_URL}/user/${userId}/favorites`);
      return response.data.favorites || [];
    } catch (error) {
      return [];
    }
  }

  // Clear chat history
  clearChatHistory(userId) {
    this.chatHistory.delete(userId);
    this.userContext.delete(userId);
  }

  // Get chat history
  getChatHistory(userId) {
    return this.chatHistory.get(userId) || [];
  }
}

// Create singleton instance
const smartChatbot = new SmartChatbotService();

export default smartChatbot;
