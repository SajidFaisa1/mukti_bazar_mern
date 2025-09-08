import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Sparkles, ShoppingCart, Star, Package, Truck, MapPin, Clock, ExternalLink, Copy, CheckCircle, Phone } from 'lucide-react';
import smartChatbot from '../services/smartChatbotService';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';

const SmartChatbot = ({ embedded = false, productContext = null }) => {
  const { user: client } = useClientAuth();
  const { user: vendor } = useVendorAuth();
  
  // Determine current user
  const currentUser = vendor || client;
  const userRole = vendor ? 'vendor' : 'client';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [orderInfo, setOrderInfo] = useState(null);
  const [copiedText, setCopiedText] = useState('');
  const messagesEndRef = useRef(null);

  // Generate user ID
  const userId = currentUser?.uid || currentUser?._id || 'anonymous';

  useEffect(() => {
    // Initialize product database for LLM training
    smartChatbot.initializeProductDatabase().then(() => {
      console.log('✅ Product database initialized for intelligent responses');
    }).catch(error => {
      console.error('❌ Failed to initialize product database:', error);
    });

    // Initialize user context when component mounts
    if (currentUser) {
      smartChatbot.initializeUserContext(userId, {
        role: userRole,
        name: currentUser.name || currentUser.businessName,
        location: currentUser.address?.city || currentUser.city
      });
    }

    // Load chat history
    const history = smartChatbot.getChatHistory(userId);
    if (history.length > 0) {
      setMessages(history);
    } else {
      // Welcome message
      setMessages([{
        role: 'assistant',
        content: `আসসালামু আলাইকুম! 👋 Mukti Bazar এ আপনাকে স্বাগতম!

আমি আপনার স্মার্ট সহায়ক। আমি সাহায্য করতে পারি:

🛒 **পণ্য খুঁজে পেতে** - কী চাচ্ছেন?
💰 **দাম তুলনা করতে** - সেরা ডিল পেতে
📦 **অর্ডার ট্র্যাক করতে** - আপনার অর্ডার কোথায়?
🤝 **ভেন্ডর খুঁজে পেতে** - কাছাকাছি কৃষক
🔄 **বার্টার সিস্টেম** - পণ্য বিনিময়
🌱 **কৃষি পরামর্শ** - ফসলের যত্ন

**অর্ডার ট্র্যাক করতে:**
"ORD-12345678-ABCD ট্র্যাক করুন" অথবা শুধু অর্ডার নম্বর দিন

আপনার প্রশ্ন করুন বা "সাহায্য" লিখুন আরও জানতে!`,
        suggestions: ['আজকের সেরা দাম', 'কাছাকাছি ভেন্ডর', 'চাল কোথায় পাবো', 'অর্ডার ট্র্যাক করুন', 'বার্টার কীভাবে করবো']
      }]);
    }
  }, [currentUser, userId, userRole]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setSuggestions([]);
    setRelatedProducts([]);
    setOrderInfo(null);

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const result = await smartChatbot.getChatResponse(userId, userMessage, userRole);
      
      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response,
        confidence: result.confidence,
        suggestions: result.suggestions,
        relatedProducts: result.relatedProducts,
        orderInfo: result.orderInfo
      }]);

      setSuggestions(result.suggestions || []);
      setRelatedProducts(result.relatedProducts || []);
      setOrderInfo(result.orderInfo);

    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'দুঃখিত, আমি এখন কিছু সমস্যার মুখোমুখি হচ্ছি। আবার চেষ্টা করুন বা আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।',
        suggestions: ['আবার চেষ্টা করুন', 'সাপোর্ট টিমের সাথে যোগাযোগ', 'অর্ডার ট্র্যাক করুন']
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleViewOrder = (orderNumber) => {
    if (orderNumber) {
      // Open order details in new tab
      window.open(`/orders/${orderNumber}`, '_blank');
    }
  };

  const handleClearChat = () => {
    smartChatbot.clearChatHistory(userId);
    setMessages([{
      role: 'assistant',
      content: 'চ্যাট ক্লিয়ার হয়ে গেছে। আবার শুরু করুন! 👋'
    }]);
    setSuggestions([]);
    setRelatedProducts([]);
    setOrderInfo(null);
  };

  // Component for rendering order information
  const OrderInfoCard = ({ order }) => {
    if (!order) return null;

    const statusColors = {
      'pending': 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200',
      'confirmed': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-200',
      'processing': 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-200',
      'shipped': 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-200',
      'delivered': 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border-emerald-200',
      'cancelled': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-200'
    };

    const statusEmojis = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '🔄',
      'shipped': '🚚',
      'delivered': '📦',
      'cancelled': '❌'
    };

    const statusTexts = {
      'pending': 'অপেক্ষমান',
      'confirmed': 'নিশ্চিত',
      'processing': 'প্রক্রিয়াকরণ',
      'shipped': 'পাঠানো হয়েছে',
      'delivered': 'ডেলিভারি সম্পন্ন',
      'cancelled': 'বাতিল'
    };

    return (
      <div className="mt-4 bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-lg p-2">
              <Package size={16} className="text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">অর্ডার তথ্য</span>
          </div>
          <button
            onClick={() => handleCopyText(order.orderNumber)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            {copiedText === order.orderNumber ? 
              <CheckCircle size={16} className="text-emerald-500" /> : 
              <Copy size={16} />
            }
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">অর্ডার নম্বর:</span>
            <span className="text-sm font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">স্ট্যাটাস:</span>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
              {statusEmojis[order.status]} {statusTexts[order.status] || order.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">মোট:</span>
            <span className="text-sm font-medium">৳{order.totalAmount}</span>
          </div>
          {order.deliveryDate && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ডেলিভারির তারিখ:</span>
              <span className="text-sm font-medium">{new Date(order.deliveryDate).toLocaleDateString('bn-BD')}</span>
            </div>
          )}
        </div>
        
        {order.orderNumber && (
          <button
            onClick={() => handleViewOrder(order.orderNumber)}
            className="mt-3 w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            সম্পূর্ণ তথ্য দেখুন
          </button>
        )}
      </div>
    );
  };

  // Component for rendering product information
  const ProductCard = ({ product }) => {
    if (!product) return null;

    return (
      <div className="mt-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-800 text-sm">{product.name}</h4>
            
            <div className="mt-2 space-y-1">
              {product.price && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600">💰</span>
                  <span className="text-sm font-medium text-emerald-700">
                    ৳{product.price} {product.unit && `(প্রতি ${product.unit})`}
                  </span>
                </div>
              )}
              
              {product.vendor && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600">👨‍🌾</span>
                  <span className="text-xs text-gray-600">
                    {product.vendor.name || product.vendor}
                  </span>
                </div>
              )}
              
              {product.vendor?.location && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600">📍</span>
                  <span className="text-xs text-gray-600">{product.vendor.location}</span>
                </div>
              )}
              
              {product.stock !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600">📊</span>
                  <span className={`text-xs font-medium ${product.stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {product.stock > 0 ? 'স্টক আছে' : 'স্টক নেই'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {product.vendor?.phone && (
            <button
              onClick={() => window.open(`tel:${product.vendor.phone}`)}
              className="ml-2 bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
              title="ভেন্ডরের সাথে যোগাযোগ"
            >
              <Phone size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full p-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 group"
        >
          <MessageCircle size={28} className="transition-transform group-hover:scale-110" />
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg">
            <Sparkles size={14} />
          </span>
          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
        </button>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full h-full' : 'fixed bottom-6 right-6 z-50'}>
      <div className={`bg-white rounded-3xl shadow-2xl border border-gray-100 ${embedded ? 'w-full h-full' : 'w-96 h-[700px]'} flex flex-col overflow-hidden backdrop-blur-sm`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 backdrop-blur-sm"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 shadow-lg">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mukti AI সহায়ক</h3>
              <div className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse shadow-sm"></div>
                <span className="text-emerald-100">অনলাইন ও প্রস্তুত</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-lg p-2 hover:scale-105 transition-all duration-200 relative z-20"
            title="চ্যাটবট বন্ধ করুন"
          >
            <X size={20} />
          </button>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 z-0"></div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                }`}>
                  {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                    : 'bg-white border border-gray-200 shadow-lg'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  {message.confidence && (
                    <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
                      <div className="w-1 h-1 bg-current rounded-full"></div>
                      নির্ভরযোগ্যতা: {(message.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                  {message.orderInfo && message.role === 'assistant' && (
                    <OrderInfoCard order={message.orderInfo} />
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Bot size={18} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {currentUser && (
          <div className="px-4 py-3 bg-gradient-to-r from-white to-gray-50 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Sparkles size={12} className="text-emerald-500" />
              দ্রুত অ্যাকশন
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setInput('আমার সাম্প্রতিক অর্ডার')}
                className="text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-3 py-2 rounded-full hover:from-blue-100 hover:to-blue-200 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md border border-blue-200"
              >
                <Package size={12} />
                সাম্প্রতিক অর্ডার
              </button>
              <button
                onClick={() => setInput('অর্ডার ট্র্যাক করুন')}
                className="text-xs bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 px-3 py-2 rounded-full hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md border border-emerald-200"
              >
                <Truck size={12} />
                ট্র্যাক করুন
              </button>
              <button
                onClick={() => setInput('চালের দাম কত?')}
                className="text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 px-3 py-2 rounded-full hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md border border-yellow-200"
              >
                💰
                দাম জানুন
              </button>
              <button
                onClick={() => setInput('কাছাকাছি ভেন্ডর')}
                className="text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 px-3 py-2 rounded-full hover:from-purple-100 hover:to-purple-200 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md border border-purple-200"
              >
                <MapPin size={12} />
                নিকটবর্তী ভেন্ডর
              </button>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <MessageCircle size={12} className="text-emerald-500" />
              দ্রুত প্রশ্ন
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 px-3 py-2 rounded-full hover:from-emerald-100 hover:to-green-100 transition-all duration-200 shadow-sm hover:shadow-md border border-emerald-200 hover:scale-105"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <ShoppingCart size={12} className="text-emerald-500" />
              সংশ্লিষ্ট পণ্য
            </div>
            <div className="space-y-2">
              {relatedProducts.slice(0, 3).map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-white to-gray-50 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <ShoppingCart size={12} className="text-emerald-500" />
              সংশ্লিষ্ট পণ্য
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {relatedProducts.slice(0, 3).map((product, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <ShoppingCart size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{product.name}</div>
                    <div className="text-xs text-emerald-600 font-medium">৳{product.unitPrice}/{product.unitType}</div>
                  </div>
                  <button className="text-gray-400 hover:text-emerald-500 transition-colors p-1 rounded-lg hover:bg-emerald-50">
                    <Star size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-gradient-to-r from-white to-gray-50 border-t border-gray-200">
          <div className="flex gap-3 relative">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="আপনার প্রশ্ন লিখুন বা অর্ডার নম্বর দিন (যেমন: ORD-12345678-ABCD)..."
                disabled={loading}
                className="w-full border border-gray-300 rounded-2xl px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder-gray-400 bg-white shadow-sm transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <MessageCircle size={16} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl px-4 py-3 transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-sm hover:scale-105 disabled:scale-100"
            >
              <Send size={20} className={loading ? 'animate-pulse' : ''} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-3">
            <button
              type="button"
              onClick={handleClearChat}
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              চ্যাট পরিষ্কার করুন
            </button>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-500" />
              Powered by Mukti AI
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmartChatbot;
