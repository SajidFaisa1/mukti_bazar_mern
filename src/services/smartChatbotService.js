import axios from 'axios';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) ||
  'http://localhost:5005/api';

class SmartChatbotService {
  constructor() {
    this.chatHistory = new Map();
    this.userContext = new Map();
    this.productData = new Map();
    this.allProductsCache = null; // Cache for all products
    this.lastProductsFetch = null; // Track when we last fetched products
    this.productsFetchInterval = 5 * 60 * 1000; // Refresh every 5 minutes
  }

  // Initialize and fetch all products for LLM training
  async initializeProductDatabase() {
    try {
      console.log('🔄 Fetching all products for LLM training...');
      const response = await fetch('/api/products?limit=1000'); // Fetch all products
      
      if (response.ok) {
        const data = await response.json();
        this.allProductsCache = data.products || [];
        this.lastProductsFetch = Date.now();
        
        console.log(`✅ Loaded ${this.allProductsCache.length} products for intelligent responses`);
        
        // Create a product knowledge base for the LLM
        this.createProductKnowledgeBase();
        
        return this.allProductsCache;
      } else {
        console.error('Failed to fetch products:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching products for LLM:', error);
      return [];
    }
  }

  // Create structured product knowledge for LLM
  createProductKnowledgeBase() {
    if (!this.allProductsCache) return '';

    // Group products by category and create structured data
    const productsByCategory = {};
    const productPriceMap = {};
    const vendorProductMap = {};

    this.allProductsCache.forEach(product => {
      const category = product.category || 'Other';
      const productName = product.name.toLowerCase();
      const price = product.price || product.unitPrice || product.offerPrice;
      const vendor = product.vendor || product.vendorName || 'Unknown Vendor';

      // Group by category
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);

      // Create price mapping
      if (price) {
        productPriceMap[productName] = {
          price: price,
          unit: product.unit || product.unitType || 'piece',
          vendor: vendor,
          location: product.location || product.vendor?.location,
          phone: product.vendor?.phone || product.vendorPhone,
          stock: product.stock || product.totalQty,
          rating: product.rating
        };
      }

      // Create vendor mapping
      if (vendor && vendor !== 'Unknown Vendor') {
        if (!vendorProductMap[vendor]) {
          vendorProductMap[vendor] = [];
        }
        vendorProductMap[vendor].push({
          name: product.name,
          price: price,
          category: category
        });
      }
    });

    // Store organized data for quick LLM access
    this.productsByCategory = productsByCategory;
    this.productPriceMap = productPriceMap;
    this.vendorProductMap = vendorProductMap;

    console.log('📊 Product knowledge base created:', {
      categories: Object.keys(productsByCategory).length,
      products: Object.keys(productPriceMap).length,
      vendors: Object.keys(vendorProductMap).length
    });
  }

  // Validate and ensure response is in acceptable language
  validateResponseLanguage(response, preferredLanguage = 'english') {
    // Check for Hindi/Japanese/other unwanted languages
    const hindiPattern = /[\u0900-\u097F]/; // Hindi characters
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/; // Japanese characters
    const urduPattern = /[\u0600-\u06FF]/; // Arabic/Urdu characters
    
    const hasUnwantedLanguage = hindiPattern.test(response) || 
                               japanesePattern.test(response) || 
                               urduPattern.test(response);
    
    if (hasUnwantedLanguage) {
      console.warn('❌ Detected unwanted language in response, providing fallback');
      
      // Provide appropriate fallback response
      if (preferredLanguage === 'english') {
        return `I apologize, but I can only communicate in English or Bengali. How can I help you with our agricultural products and services?

🌾 **Available Services:**
• Product pricing and availability
• Vendor contact information  
• Order tracking and support
• Agricultural marketplace guidance

Please ask your question in English or Bengali.`;
      } else {
        return `দুঃখিত, আমি শুধুমাত্র ইংরেজি বা বাংলায় কথা বলতে পারি। কৃষি পণ্য ও সেবা নিয়ে কীভাবে সাহায্য করতে পারি?

🌾 **উপলব্ধ সেবা:**
• পণ্যের দাম ও স্টক তথ্য
• ভেন্ডরের যোগাযোগের তথ্য
• অর্ডার ট্র্যাকিং ও সাপোর্ট  
• কৃষি বাজারের গাইডেন্স

অনুগ্রহ করে ইংরেজি বা বাংলায় প্রশ্ন করুন।`;
      }
    }
    
    return response;
  }

  // Get fresh product data if cache is stale
  async ensureFreshProductData() {
    const now = Date.now();
    if (!this.allProductsCache || 
        !this.lastProductsFetch || 
        (now - this.lastProductsFetch) > this.productsFetchInterval) {
      await this.initializeProductDatabase();
    }
    return this.allProductsCache;
  }

  // Intelligent product search from cached data
  searchProductsFromCache(query, limit = 5) {
    if (!this.allProductsCache || !this.productPriceMap) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/);
    const results = [];

    // Direct name matching first
    Object.keys(this.productPriceMap).forEach(productName => {
      const score = this.calculateMatchScore(productName, searchTerms);
      if (score > 0) {
        const productData = this.productPriceMap[productName];
        const fullProduct = this.allProductsCache.find(p => 
          p.name.toLowerCase() === productName
        );
        
        if (fullProduct) {
          results.push({
            ...fullProduct,
            matchScore: score,
            priceData: productData
          });
        }
      }
    });

    // Sort by match score and return top results
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)
      .map(item => ({
        ...item,
        price: item.priceData.price,
        unit: item.priceData.unit,
        vendor: item.priceData.vendor,
        location: item.priceData.location,
        phone: item.priceData.phone,
        stock: item.priceData.stock,
        rating: item.priceData.rating
      }));
  }

  // Calculate match score between product name and search terms
  calculateMatchScore(productName, searchTerms) {
    let score = 0;
    const productWords = productName.split(/\s+/);
    
    searchTerms.forEach(term => {
      if (term.length < 2) return; // Skip very short terms
      
      // Exact match gets highest score
      if (productName.includes(term)) {
        score += term.length === productName.length ? 100 : 50;
      }
      
      // Partial word match
      productWords.forEach(word => {
        if (word.includes(term) || term.includes(word)) {
          score += 25;
        }
      });
      
      // Fuzzy matching for common variations
      if (this.isSimilarWord(term, productName)) {
        score += 15;
      }
    });
    
    return score;
  }

  // Check for similar words (common variations)
  isSimilarWord(term, productName) {
    const variations = {
      'tomato': ['টমেটো', 'tamato'],
      'rice': ['চাল', 'chawal'],
      'potato': ['আলু', 'aloo'],
      'onion': ['পিয়াজ', 'piaz'],
      'wheat': ['গম', 'gom']
    };
    
    for (const [key, vars] of Object.entries(variations)) {
      if ((key === term || vars.includes(term)) && 
          (productName.includes(key) || vars.some(v => productName.includes(v)))) {
        return true;
      }
    }
    return false;
  }

  // Generate comprehensive product context for LLM
  generateProductContext(query) {
    const products = this.searchProductsFromCache(query, 10);
    
    if (products.length === 0) {
      return 'No products found matching the query.';
    }

    let context = `AVAILABLE PRODUCTS FOR "${query}":\n\n`;
    
    products.forEach((product, index) => {
      context += `${index + 1}. ${product.name}\n`;
      context += `   Price: ৳${product.price}${product.unit ? `/${product.unit}` : ''}\n`;
      context += `   Vendor: ${product.vendor}\n`;
      
      if (product.location) {
        context += `   Location: ${product.location}\n`;
      }
      
      if (product.phone) {
        context += `   Contact: ${product.phone}\n`;
      }
      
      if (product.stock !== undefined) {
        context += `   Stock: ${product.stock > 0 ? 'Available' : 'Out of Stock'}\n`;
      }
      
      if (product.category) {
        context += `   Category: ${product.category}\n`;
      }
      
      context += '\n';
    });
    
    return context;
  }

  // Initialize user context with their data
  async initializeUserContext(userId, userData) {
    try {
      // Skip initialization for guest users
      if (userId.startsWith('guest-') || !userData.userId) {
        console.log('Skipping user context initialization for guest user');
        return;
      }

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

IMPORTANT: You have access to COMPLETE PRODUCT DATABASE with real-time pricing and vendor information. Use this data to provide accurate, specific answers about products, prices, and vendors.

YOUR CAPABILITIES:
1. 🛒 SHOPPING ASSISTANCE:
   - Access to complete product catalog with real prices and vendor details
   - Instant price lookups from cached product database
   - Stock availability checks with vendor contact info
   - Bulk quantity calculations and wholesale pricing
   - Product specifications and quality ratings

2. 🏪 VENDOR INFORMATION:
   - Complete vendor database with contact numbers and locations
   - Vendor ratings, reviews, and certifications
   - Direct communication facilitation with vendors
   - Location-based vendor matching for quick delivery
   - Vendor specialties and product categories

3. 📦 ORDER SUPPORT:
   - Order tracking and status updates (format: ORD-XXXXXXXX-XXXX or VND-XXXXXXXX-XXXX)
   - Delivery information and estimated times
   - Return and refund policies
   - Order modification requests
   - Payment status inquiries
   - Invoice and receipt assistance

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
- CRITICAL: ONLY respond in English or Bengali (বাংলা) - NO OTHER LANGUAGES
- If user asks in English, respond in English
- If user asks in Bengali, respond in Bengali  
- NEVER use Hindi, Japanese, or any other language
- Use simple, clear language appropriate for Bangladeshi agricultural context
- Provide specific, actionable information
- If you don't know something, admit it and suggest contacting human support
- Always consider the user's context and history when responding
- Keep responses focused and relevant to agricultural marketplace needs`;

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

  // New: format detection context to a concise system message
  formatDetectionContext(ctx) {
    if (!ctx) return '';
    const plant = ctx?.prediction?.plant || 'unknown';
    const disease = ctx?.prediction?.disease || 'unknown';
    const healthy = ctx?.prediction?.is_healthy ? 'yes' : 'no';
    const conf = typeof ctx?.prediction?.confidence === 'number' ? `${(ctx.prediction.confidence * 100).toFixed(1)}%` : 'n/a';
    const sev = ctx?.disease_info?.severity || 'n/a';
    return [
      `PLANT DETECTION CONTEXT`,
      `- Plant: ${plant}`,
      `- Disease: ${disease}`,
      `- Healthy: ${healthy}`,
      `- Confidence: ${conf}`,
      `- Severity: ${sev}`,
      ctx?.recommendation ? `- Recommendation: ${ctx.recommendation}` : null
    ].filter(Boolean).join('\n');
  }

  // Enhanced chat response with context awareness (+ detection context)
  async getChatResponse(userId, message, userRole = 'client', extra = {}) {
    try {
      // Ensure we have fresh product data for LLM training
      await this.ensureFreshProductData();

      // Get user context
      let userContext = this.userContext.get(userId);
      if (!userContext) {
        userContext = { role: userRole, lastActivity: new Date() };
        this.userContext.set(userId, userContext);
      }

      // Get chat history
      let history = this.chatHistory.get(userId) || [];
      history.push({ role: 'user', content: message });

      // Check for order tracking queries first
      const orderQuery = this.detectOrderQuery(message);
      let orderContext = '';
      let orderInfo = null;

      if (orderQuery.isOrderQuery) {
        try {
          if (orderQuery.orderNumbers.length > 0) {
            // User provided specific order number(s)
            for (const orderNumber of orderQuery.orderNumbers) {
              try {
                const tracking = await this.getOrderTracking(orderNumber, userId);
                orderInfo = await this.getOrderInfo(orderNumber, userId);
                orderContext = this.formatTrackingInfo(tracking);
                
                // Return direct tracking response
                const response = `আপনার অর্ডারের তথ্য:\n\n${orderContext}\n\nআরও সাহায্যের জন্য আমাকে জিজ্ঞাসা করুন!`;
                
                history.push({ role: 'assistant', content: response });
                this.chatHistory.set(userId, history);
                
                return {
                  response,
                  confidence: 0.95,
                  suggestions: [
                    'আরেকটি অর্ডার ট্র্যাক করুন',
                    'ডেলিভারি সম্পর্কে জানুন',
                    'রিটার্ন পলিসি',
                    'সাপোর্ট যোগাযোগ'
                  ],
                  relatedProducts: [],
                  orderInfo: orderInfo
                };
              } catch (orderError) {
                orderContext = `❌ ${orderError.message}`;
              }
            }
          } else if (orderQuery.hasTrackingKeywords) {
            // User asked about tracking but didn't provide order number
            orderContext = `অর্ডার ট্র্যাক করতে আপনার অর্ডার নম্বর দিন। 

অর্ডার নম্বর সাধারণত এই ফরম্যাটে থাকে:
• ORD-12345678-ABCD (সাধারণ অর্ডার)
• VND-12345678-ABCD (ভেন্ডর অর্ডার)

আপনি আপনার ইমেইল বা SMS এ অর্ডার নম্বর পাবেন।`;
            
            history.push({ role: 'assistant', content: orderContext });
            this.chatHistory.set(userId, history);
            
            return {
              response: orderContext,
              confidence: 0.9,
              suggestions: [
                'আমার সাম্প্রতিক অর্ডার দেখান',
                'অর্ডার নম্বর কোথায় পাবো?',
                'ডেলিভারি সময় কতক্ষণ?',
                'সাপোর্ট যোগাযোগ'
              ],
              relatedProducts: []
            };
          }
        } catch (error) {
          console.error('Order query error:', error);
          orderContext = `দুঃখিত, অর্ডার তথ্য আনতে সমস্যা হচ্ছে। ${error.message}`;
        }
      }

      // Check if user is asking about products - use cached data for LLM training
      const productQuery = await this.detectProductQuery(message);
      let productContext = '';
      let relatedProducts = [];
      
      if (productQuery.isProductQuery) {
        console.log('Product query detected:', productQuery);
        
        // Extract search terms and get products from cache instead of API
        const searchTerms = this.extractSearchTerms(message, productQuery.keywords);
        const searchQuery = searchTerms.join(' ') || message;
        
        console.log('Search query for cached products:', searchQuery);
        
        // Get products from cache - much faster and better for LLM
        const products = this.searchProductsFromCache(searchQuery, 10);
        console.log('Products from cache:', products.length);
        
        // Generate comprehensive product context for LLM
        productContext = this.generateProductContext(searchQuery);
        relatedProducts = products.slice(0, 3); // Show top 3 related products
        
        // If this is primarily a product query, return formatted product info immediately
        if (productQuery.confidence > 0.3 || productQuery.isProductQuery) {
          const productResponse = this.formatProductInfo(products, productQuery.queryType, productQuery.preferredLanguage);
          
          history.push({ role: 'assistant', content: productResponse });
          this.chatHistory.set(userId, history);
          
          return {
            response: productResponse,
            confidence: 0.9,
            suggestions: this.generateProductSuggestions(productQuery, products),
            relatedProducts: relatedProducts
          };
        }
      }

      // Prepare enhanced system prompt
      const systemPrompt = this.generateSystemPrompt(userContext);
      
      // New: include detection context if provided
      const detectionContextMsg = extra?.detectionContext
        ? this.formatDetectionContext(extra.detectionContext)
        : '';

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: 'CRITICAL: You must ONLY respond in English or Bengali (বাংলা). Never use Hindi, Japanese, Urdu, or any other language. This is for Bangladeshi users only.' },
        ...(productContext ? [{ role: 'system', content: `RELEVANT PRODUCTS:\n${productContext}` }] : []),
        ...(orderContext ? [{ role: 'system', content: `ORDER INFORMATION:\n${orderContext}` }] : []),
        ...(detectionContextMsg ? [{ role: 'system', content: detectionContextMsg }] : []),
        ...history.slice(-10) // Keep last 10 messages for context
      ];

      // Call chat API with context
      const response = await axios.post(`${API_URL}/chat`, { 
        messages,
        userId,
        userRole,
        contextData: userContext,
        detectionContext: extra?.detectionContext || null,
        orderQuery: orderQuery.isOrderQuery ? orderQuery : null
      }, {
        headers: {
          'X-Session-Id': userId || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
        }
      });

      console.log('Chat API Response:', response.data); // Debug log

      if (response.data?.success) {
        const rawAiResponse = response.data.response;
        
        // Validate and correct language if needed
        const productQuery = await this.detectProductQuery(message);
        const validatedResponse = this.validateResponseLanguage(rawAiResponse, productQuery.preferredLanguage);
        
        history.push({ role: 'assistant', content: validatedResponse });
        this.chatHistory.set(userId, history);
        
        // Update user activity
        userContext.lastActivity = new Date();
        this.userContext.set(userId, userContext);

        return {
          response: validatedResponse,
          confidence: response.data.confidence || 0.8,
          suggestions: response.data.suggestions || this.generateSuggestions(message, orderQuery, productQuery),
          relatedProducts: productQuery.isProductQuery ? await this.searchProducts(productQuery.keywords, 3) : [],
          orderInfo: orderInfo
        };
      } else {
        throw new Error(response.data?.error || 'AI service error');
      }

    } catch (error) {
      console.error('Smart chatbot error:', error);
      
      // Provide more specific error messages
      let errorMessage = "I'm having trouble right now. Please try again or contact our support team.";
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          errorMessage = "Chat service is currently unavailable. Please try again later.";
        } else if (error.response.status === 500) {
          errorMessage = "Our AI service is experiencing issues. Please try again in a few moments.";
        } else {
          errorMessage = error.response.data?.error || errorMessage;
        }
      } else if (error.request) {
        // Network error
        errorMessage = "Unable to connect to our AI service. Please check your internet connection.";
      }
      
      return {
        response: errorMessage,
        confidence: 0,
        suggestions: ['Try rephrasing your question', 'Contact human support', 'Check your internet connection'],
        relatedProducts: []
      };
    }
  }

  // Generate smart suggestions based on query type
  generateSuggestions(message, orderQuery, productQuery) {
    const defaultSuggestions = [
      'আজকের সেরা দাম',
      'কাছাকাছি ভেন্ডর',
      'বার্টার কীভাবে করবো',
      'সাপোর্ট যোগাযোগ'
    ];

    if (orderQuery.isOrderQuery) {
      return [
        'আরেকটি অর্ডার ট্র্যাক করুন',
        'ডেলিভারি সময় কতক্ষণ?',
        'রিটার্ন পলিসি',
        'পেমেন্ট স্ট্যাটাস'
      ];
    }

    if (productQuery.isProductQuery) {
      return [
        'দাম তুলনা করুন',
        'স্টক আছে কিনা?',
        'কাছাকাছি ভেন্ডর',
        'বাল্ক অর্ডার ছাড়'
      ];
    }

    return defaultSuggestions;
  }

  // Detect order tracking queries
  detectOrderQuery(message) {
    // Look for order numbers (pattern: ORD-XXXXXXXX-XXXX or VND-XXXXXXXX-XXXX)
    const orderNumberPattern = /(ORD|VND)-\d{8}-[A-Z0-9]{4}/gi;
    const orderNumbers = message.match(orderNumberPattern) || [];
    
    // Look for tracking keywords
    const trackingKeywords = [
      'track', 'tracking', 'order', 'delivery', 'status', 'where', 'when',
      'ট্র্যাক', 'অর্ডার', 'ডেলিভারি', 'স্ট্যাটাস', 'কোথায়', 'কখন', 'অবস্থা'
    ];
    
    const hasTrackingKeywords = trackingKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      isOrderQuery: orderNumbers.length > 0 || hasTrackingKeywords,
      orderNumbers,
      hasTrackingKeywords,
      confidence: orderNumbers.length > 0 ? 1.0 : (hasTrackingKeywords ? 0.7 : 0)
    };
  }

  // Detect product queries with more sophisticated patterns
  // Detect product queries with intelligent product name extraction
  async detectProductQuery(message) {
    // Core product names (not search keywords)
    const productKeywords = [
      'rice', 'wheat', 'potato', 'tomato', 'onion', 'garlic', 'corn', 'jute',
      'fertilizer', 'seeds', 'pesticide', 'feed', 'equipment', 'machinery',
      'carrot', 'cabbage', 'spinach', 'cucumber', 'pumpkin', 'brinjal', 'okra'
    ];

    const bengaliProductKeywords = [
      'চাল', 'গম', 'আলু', 'টমেটো', 'পিয়াজ', 'রসুন', 'ভুট্টা', 'পাট',
      'সার', 'বীজ', 'কীটনাশক', 'খাদ্য', 'যন্ত্রপাতি', 'গাজর', 'বাঁধাকপি', 
      'পালং শাক', 'শসা', 'কুমড়া', 'বেগুন', 'ঢেঁড়স'
    ];

    // Price and vendor query indicators
    const priceKeywords = [
      'price', 'cost', 'rate', 'how much', 'expensive', 'cheap', 'affordable', 'current price',
      'দাম', 'টাকা', 'কত', 'সস্তা', 'দামি', 'কিনতে', 'বিক্রয়', 'বর্তমান দাম'
    ];

    const vendorKeywords = [
      'vendor', 'seller', 'farmer', 'supplier', 'who sells', 'where to buy',
      'contact', 'phone', 'location', 'address',
      'ভেন্ডর', 'বিক্রেতা', 'কৃষক', 'কে বিক্রি করে', 'কোথায় কিনবো', 'কোথায় পাবো',
      'যোগাযোগ', 'ফোন', 'ঠিকানা'
    ];

    const messageLower = message.toLowerCase();
    
    // Find actual product names mentioned
    const allProductKeywords = [...productKeywords, ...bengaliProductKeywords];
    const foundProducts = allProductKeywords.filter(keyword => 
      messageLower.includes(keyword.toLowerCase())
    );

    const hasPriceQuery = priceKeywords.some(keyword => 
      messageLower.includes(keyword.toLowerCase())
    );

    const hasVendorQuery = vendorKeywords.some(keyword => 
      messageLower.includes(keyword.toLowerCase())
    );

    // Enhanced pattern matching for product queries
    const productPatterns = [
      /(?:price of|cost of|rate of)\s+(\w+)/i,
      /(\w+)\s+(?:price|cost|rate|দাম)/i,
      /current\s+(?:price\s+of\s+)?(\w+)/i,
      /how\s+much\s+(?:is\s+)?(\w+)/i,
      /who\s+sells\s+(\w+)/i,
      /where\s+to\s+buy\s+(\w+)/i
    ];

    let extractedProducts = [];
    productPatterns.forEach(pattern => {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        extractedProducts.push(match[1]);
      }
    });

    // Detect language preference
    const isBengaliQuery = bengaliProductKeywords.some(keyword => 
      messageLower.includes(keyword.toLowerCase())
    ) || /[\u0980-\u09FF]/.test(message);

    const isEnglishQuery = productKeywords.some(keyword => 
      messageLower.includes(keyword.toLowerCase())
    ) && !/[\u0980-\u09FF]/.test(message);

    // Calculate confidence based on product mentions and query patterns
    let confidence = 0;
    if (foundProducts.length > 0) confidence += 0.6;
    if (extractedProducts.length > 0) confidence += 0.3;
    if (hasPriceQuery && (foundProducts.length > 0 || extractedProducts.length > 0)) confidence += 0.3;
    if (hasVendorQuery && (foundProducts.length > 0 || extractedProducts.length > 0)) confidence += 0.2;

    const isProductQuery = foundProducts.length > 0 || extractedProducts.length > 0 || 
                          (hasPriceQuery && productPatterns.some(p => p.test(message)));

    console.log('Product query analysis:', {
      message,
      foundProducts,
      extractedProducts,
      hasPriceQuery,
      hasVendorQuery,
      confidence,
      isProductQuery
    });

    return {
      isProductQuery,
      keywords: [...foundProducts, ...extractedProducts],
      hasPriceQuery,
      hasVendorQuery,
      confidence: Math.min(confidence, 1.0),
      extractedProducts,
      queryType: hasPriceQuery && hasVendorQuery ? 'price_and_vendor' : 
                 hasPriceQuery ? 'price' : 
                 hasVendorQuery ? 'vendor' : 'general',
      preferredLanguage: isBengaliQuery ? 'bangla' : isEnglishQuery ? 'english' : 'auto'
    };
  }

  // Get order information by order number
  async getOrderInfo(orderNumber, userId) {
    try {
      // Get user token for authentication
      const token = this.getUserToken(userId);
      if (!token) {
        throw new Error('Authentication required for order tracking');
      }

      const response = await axios.get(`${API_URL}/orders/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        return response.data.order;
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      console.error('Order fetch error:', error);
      if (error.response?.status === 404) {
        throw new Error('Order not found. Please check the order number.');
      } else if (error.response?.status === 401) {
        throw new Error('Please login to track your orders.');
      }
      throw new Error('Unable to fetch order information. Please try again.');
    }
  }

  // Get order tracking information
  async getOrderTracking(orderNumber, userId) {
    try {
      const token = this.getUserToken(userId);
      if (!token) {
        throw new Error('Authentication required for order tracking');
      }

      const response = await axios.get(`${API_URL}/orders/${orderNumber}/tracking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        return response.data.tracking;
      } else {
        throw new Error('Tracking information not found');
      }
    } catch (error) {
      console.error('Order tracking error:', error);
      if (error.response?.status === 404) {
        throw new Error('Order tracking not found. Please check the order number.');
      } else if (error.response?.status === 401) {
        throw new Error('Please login to track your orders.');
      }
      throw new Error('Unable to fetch tracking information. Please try again.');
    }
  }

  // Fetch products with filters
  async fetchProducts(filters = {}) {
    try {
      let url = '/api/products';
      const params = new URLSearchParams();
      
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.minPrice) {
        params.append('minPrice', filters.minPrice);
      }
      if (filters.maxPrice) {
        params.append('maxPrice', filters.maxPrice);
      }
      if (filters.vendor) {
        params.append('vendor', filters.vendor);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.products || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  // Format product information with pricing and vendor details
  formatProductInfo(products, queryType = 'general', preferredLanguage = 'auto') {
    if (!products || products.length === 0) {
      if (preferredLanguage === 'english') {
        return `Sorry, no products found matching your search at the moment.

🔍 **Suggestions:**
• Try different product names
• Use alternative spellings (e.g.: tomato, টমেটো)
• Specify product category (e.g.: vegetables, fruits, grains)

📞 **Contact us for assistance**`;
      } else {
        return `দুঃখিত, আপনার খোঁজের পণ্য এই মুহূর্তে পাওয়া যাচ্ছে না। 

🔍 **পরামর্শ:**
• অন্য কোনো পণ্যের নাম দিয়ে চেষ্টা করুন
• বিভিন্ন বানানে লিখে দেখুন (যেমন: টমেটো, tomato)
• পণ্যের ক্যাটেগরি বলুন (যেমন: সবজি, ফল, দানাদার)

📞 **সাহায্যের জন্য যোগাযোগ করুন**`;
      }
    }

    const isEnglish = preferredLanguage === 'english';
    let response = isEnglish 
      ? `🌾 **Product Information** (${products.length} products found):\n\n`
      : `🌾 **পণ্যের তথ্য** (${products.length}টি পণ্য পাওয়া গেছে):\n\n`;

    products.slice(0, 5).forEach((product, index) => {
      response += `**${index + 1}. ${product.name}**\n`;
      
      // Price information
      if (product.price || product.unitPrice || product.offerPrice) {
        const price = product.price || product.unitPrice || product.offerPrice;
        response += `   💰 **মূল্য:** ${price} টাকা`;
        if (product.unit || product.unitType) {
          response += ` (প্রতি ${product.unit || product.unitType})`;
        }
        response += '\n';
      }

      // Vendor information
      if (product.vendor || product.vendorName) {
        const vendorName = product.vendor?.name || product.vendorName || product.vendor;
        response += `   👨‍🌾 **বিক্রেতা:** ${vendorName}\n`;
        
        if (product.vendor?.phone) {
          response += `   📞 **ফোন:** ${product.vendor.phone}\n`;
        }
        if (product.vendor?.location || product.location) {
          response += `   📍 **অবস্থান:** ${product.vendor?.location || product.location}\n`;
        }
      }

      // Category and availability
      if (product.category) {
        response += `   📦 **ক্যাটেগরি:** ${product.category}\n`;
      }
      
      if (product.stock !== undefined || product.totalQty !== undefined) {
        const stock = product.stock || product.totalQty;
        response += `   📊 **স্টক:** ${stock > 0 ? `${stock} পাওয়া যাচ্ছে` : 'স্টক নেই'}\n`;
      }

      // Quality rating if available
      if (product.rating) {
        response += `   ⭐ **রেটিং:** ${product.rating}/5\n`;
      }

      response += '\n';
    });

    if (products.length > 5) {
      response += `**আরো ${products.length - 5}টি পণ্য রয়েছে।** আরো দেখতে চাইলে আরো নির্দিষ্ট খোঁজ দিন।\n\n`;
    }

    // Add helpful suggestions based on query type
    if (queryType === 'price') {
      response += `💡 **সাহায্যকারী টিপস:**\n`;
      response += `• দাম তুলনা করতে "compare prices of [product]" লিখুন\n`;
      response += `• সবচেয়ে সস্তা পণ্য দেখতে "cheapest [product]" লিখুন\n`;
    } else if (queryType === 'vendor') {
      response += `💡 **ভেন্ডর সম্পর্কে:**\n`;
      response += `• নির্দিষ্ট এলাকার ভেন্ডর খুঁজতে "vendors in [location]" লিখুন\n`;
      response += `• ভেন্ডরের রেটিং দেখতে পণ্যের উপর ক্লিক করুন\n`;
    }

    return response;
  }

  // Extract search terms from user message - focus on product names only
  extractSearchTerms(message, keywords) {
    // Common product names in English and Bengali
    const productNames = [
      'rice', 'চাল', 'wheat', 'গম', 'potato', 'আলু', 'tomato', 'টমেটো', 
      'onion', 'পিয়াজ', 'garlic', 'রসুন', 'corn', 'ভুট্টা', 'jute', 'পাট',
      'fertilizer', 'সার', 'seeds', 'বীজ', 'pesticide', 'কীটনাশক', 
      'feed', 'খাদ্য', 'equipment', 'যন্ত্রপাতি', 'machinery', 'মেশিন',
      'carrot', 'গাজর', 'cabbage', 'বাঁধাকপি', 'spinach', 'পালং শাক',
      'cucumber', 'শসা', 'pumpkin', 'কুমড়া', 'brinjal', 'বেগুন',
      'okra', 'ঢেঁড়স', 'green chili', 'কাঁচা মরিচ', 'beans', 'শিম'
    ];

    const messageLower = message.toLowerCase();
    const extractedProducts = [];

    // Find product names mentioned in the message
    productNames.forEach(product => {
      if (messageLower.includes(product.toLowerCase())) {
        extractedProducts.push(product);
      }
    });

    // Use regex to extract product names from common patterns
    const patterns = [
      /price\s+of\s+(\w+)/gi,
      /(\w+)\s+price/gi,
      /current\s+price\s+of\s+(\w+)/gi,
      /how\s+much\s+(?:is\s+)?(\w+)/gi,
      /(\w+)\s*(?:দাম|cost|rate)/gi,
      /(?:দাম|price)\s+(\w+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        if (match[1] && match[1].length > 2) {
          extractedProducts.push(match[1]);
        }
      }
    });

    // Remove duplicates and filter out common words
    const commonWords = ['price', 'cost', 'rate', 'how', 'much', 'current', 'today', 'দাম', 'কত', 'টাকা'];
    const filteredProducts = [...new Set(extractedProducts)]
      .filter(term => !commonWords.includes(term.toLowerCase()))
      .filter(term => term.length > 2);

    return filteredProducts;
  }

  // Build product filters based on message analysis - focus on product names only
  buildProductFilters(message, searchTerms, productQuery) {
    const filters = {};
    
    // Use only the extracted product names for search, not the entire message
    if (searchTerms.length > 0) {
      // Join product names with space, not the entire prompt
      filters.search = searchTerms.join(' ');
    } else {
      // Fallback: extract the main product from patterns if no products detected
      const productPatterns = [
        /(?:price of|cost of|rate of)\s+(\w+)/i,
        /(\w+)\s+(?:price|cost|rate|দাম)/i,
        /current\s+(?:price\s+of\s+)?(\w+)/i
      ];
      
      for (const pattern of productPatterns) {
        const match = message.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          filters.search = match[1];
          break;
        }
      }
    }
    
    // Price-related filters (keep this functionality)
    const priceMatch = message.match(/(\d+)\s*(?:টাকা|taka|tk|৳)/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1]);
      if (message.includes('under') || message.includes('কম') || message.includes('নিচে')) {
        filters.maxPrice = price;
      } else if (message.includes('above') || message.includes('বেশি') || message.includes('উপরে')) {
        filters.minPrice = price;
      }
    }
    
    // Remove automatic category detection - let the backend search handle this
    // The LLM should focus on product names, not categories
    
    console.log('Smart filters for LLM chatbot:', filters);
    return filters;
  }

  // Generate contextual suggestions for product queries
  generateProductSuggestions(productQuery, products) {
    const suggestions = [];
    const isEnglish = productQuery.preferredLanguage === 'english';
    
    if (productQuery.queryType === 'price' || productQuery.queryType === 'price_and_vendor') {
      suggestions.push(isEnglish ? '💰 Show cheapest prices' : '💰 সবচেয়ে সস্তা দাম দেখান');
      suggestions.push(isEnglish ? '📊 Compare prices' : '📊 দাম তুলনা করুন');
    }
    
    if (productQuery.queryType === 'vendor' || productQuery.queryType === 'price_and_vendor') {
      suggestions.push(isEnglish ? '👨‍🌾 Vendors near me' : '👨‍🌾 আমার এলাকার ভেন্ডর');
      suggestions.push(isEnglish ? '⭐ Top rated vendors' : '⭐ টপ রেটেড ভেন্ডর');
    }
    
    if (products && products.length > 0) {
      suggestions.push(isEnglish ? '🛒 Add to cart' : '🛒 কার্টে যোগ করুন');
      suggestions.push(isEnglish ? '💬 Contact vendor' : '💬 ভেন্ডরের সাথে যোগাযোগ');
    }
    
    suggestions.push(isEnglish ? '🔍 Search other products' : '🔍 অন্য পণ্য খুঁজুন');
    suggestions.push(isEnglish ? '📋 View all products' : '📋 সকল পণ্য দেখুন');
    
    return suggestions.slice(0, 4); // Return max 4 suggestions
  }

  // Get user authentication token
  getUserToken(userId) {
    // Try to get token from localStorage first (client)
    const clientToken = typeof window !== 'undefined' ? localStorage.getItem('clientToken') : null;
    if (clientToken) return clientToken;

    // Try to get token from sessionStorage (vendor)
    const vendorToken = typeof window !== 'undefined' ? sessionStorage.getItem('vendorToken') : null;
    if (vendorToken) return vendorToken;

    return null;
  }

  // Format order information for display
  formatOrderInfo(order) {
    if (!order) return '';

    const statusEmojis = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '🔄',
      'shipped': '🚚',
      'delivered': '📦',
      'cancelled': '❌',
      'refunded': '💰'
    };

    const statusBengali = {
      'pending': 'অপেক্ষমান',
      'confirmed': 'নিশ্চিত',
      'processing': 'প্রক্রিয়াকরণ',
      'shipped': 'পাঠানো হয়েছে',
      'delivered': 'ডেলিভারি সম্পন্ন',
      'cancelled': 'বাতিল',
      'refunded': 'ফেরত'
    };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `📋 **Order Details:**

🆔 **Order Number:** ${order.orderNumber}
${statusEmojis[order.status]} **Status:** ${statusBengali[order.status] || order.status}
💰 **Total Amount:** ৳${order.total?.toFixed(2) || 'N/A'}
📅 **Order Date:** ${formatDate(order.orderedAt)}

📦 **Items:** ${order.items?.length || 0} item(s)
${order.items?.slice(0, 3).map(item => 
  `• ${item.name} (${item.quantity} ${item.unitType || 'pcs'}) - ৳${((item.offerPrice || item.unitPrice || item.price) * item.quantity).toFixed(2)}`
).join('\n') || ''}
${order.items?.length > 3 ? `... and ${order.items.length - 3} more items` : ''}

🚚 **Delivery Method:** ${order.deliveryMethod || 'Standard'}
📍 **Delivery Address:** ${order.deliveryAddress?.city}, ${order.deliveryAddress?.district}

${order.trackingNumber ? `📱 **Tracking Number:** ${order.trackingNumber}` : ''}
${order.estimatedDelivery ? `🕐 **Estimated Delivery:** ${formatDate(order.estimatedDelivery)}` : ''}`;
  }

  // Format tracking information for display
  formatTrackingInfo(tracking) {
    if (!tracking) return '';

    const statusEmojis = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '🔄',
      'shipped': '🚚',
      'delivered': '📦',
      'cancelled': '❌'
    };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    let trackingInfo = `🚚 **Tracking Information:**

🆔 **Order:** ${tracking.orderNumber}
${statusEmojis[tracking.status]} **Current Status:** ${tracking.status}

📅 **Timeline:**`;

    // Add status history
    if (tracking.statusHistory && tracking.statusHistory.length > 0) {
      tracking.statusHistory.reverse().forEach(status => {
        trackingInfo += `\n• ${statusEmojis[status.status] || '•'} ${status.status} - ${formatDate(status.timestamp)}`;
        if (status.note) trackingInfo += ` (${status.note})`;
      });
    } else {
      // Use individual timestamp fields if no history
      if (tracking.orderedAt) trackingInfo += `\n• ⏳ Ordered - ${formatDate(tracking.orderedAt)}`;
      if (tracking.confirmedAt) trackingInfo += `\n• ✅ Confirmed - ${formatDate(tracking.confirmedAt)}`;
      if (tracking.shippedAt) trackingInfo += `\n• 🚚 Shipped - ${formatDate(tracking.shippedAt)}`;
      if (tracking.deliveredAt) trackingInfo += `\n• 📦 Delivered - ${formatDate(tracking.deliveredAt)}`;
    }

    if (tracking.estimatedDelivery) {
      trackingInfo += `\n\n🕐 **Estimated Delivery:** ${formatDate(tracking.estimatedDelivery)}`;
    }

    if (tracking.trackingNumber) {
      trackingInfo += `\n📱 **Tracking Number:** ${tracking.trackingNumber}`;
    }

    if (tracking.courier) {
      trackingInfo += `\n🚐 **Courier:** ${tracking.courier}`;
    }

    if (tracking.trackingUrl) {
      trackingInfo += `\n🔗 **Track Online:** ${tracking.trackingUrl}`;
    }

    return trackingInfo;
  }

  // Search products for context
  async searchProducts(keywords, limit = 10) {
    try {
      const response = await axios.get(`${API_URL}/products/search`, {
        params: { q: keywords.join(' '), limit }
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
      const token = this.getUserToken(userId);
      if (!token) return [];

      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { limit: 5 } // Get last 5 orders
      });
      return response.data.orders || [];
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
      return [];
    }
  }

  async fetchUserCart(userId) {
    try {
      const response = await axios.get(`${API_URL}/cart/uid/${userId}`);
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

