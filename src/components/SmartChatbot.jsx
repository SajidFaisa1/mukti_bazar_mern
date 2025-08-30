import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Sparkles, ShoppingCart, Star } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  // Generate user ID
  const userId = currentUser?.uid || currentUser?._id || 'anonymous';

  useEffect(() => {
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

আপনার প্রশ্ন করুন বা "সাহায্য" লিখুন আরও জানতে!`,
        suggestions: ['আজকের সেরা দাম', 'কাছাকাছি ভেন্ডর', 'চাল কোথায় পাবো', 'বার্টার কীভাবে করবো']
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
        relatedProducts: result.relatedProducts
      }]);

      setSuggestions(result.suggestions || []);
      setRelatedProducts(result.relatedProducts || []);

    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'দুঃখিত, আমি এখন কিছু সমস্যার মুখোমুখি হচ্ছি। আবার চেষ্টা করুন বা আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।',
        suggestions: ['আবার চেষ্টা করুন', 'সাপোর্ট টিমের সাথে যোগাযোগ']
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  const handleClearChat = () => {
    smartChatbot.clearChatHistory(userId);
    setMessages([{
      role: 'assistant',
      content: 'চ্যাট ক্লিয়ার হয়ে গেছে। আবার শুরু করুন! 👋'
    }]);
    setSuggestions([]);
    setRelatedProducts([]);
  };

  // Chat toggle button for non-embedded mode
  if (!embedded && !isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <MessageCircle size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            <Sparkles size={12} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={embedded ? 'w-full h-full' : 'fixed bottom-6 right-6 z-50'}>
      <div className={`bg-white rounded-2xl shadow-2xl border ${embedded ? 'w-full h-full' : 'w-96 h-[600px]'} flex flex-direction-column overflow-hidden`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-semibold">Mukti AI সহায়ক</h3>
              <div className="text-xs flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                অনলাইন
              </div>
            </div>
          </div>
          {!embedded && (
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'} text-white text-sm`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  {message.confidence && (
                    <div className="mt-2 text-xs opacity-70">
                      নির্ভরযোগ্যতা: {(message.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2 bg-white border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">দ্রুত প্রশ্ন:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="px-4 py-2 bg-white border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">সংশ্লিষ্ট পণ্য:</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {relatedProducts.slice(0, 3).map((product, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs text-gray-600">৳{product.unitPrice}/{product.unitType}</div>
                  </div>
                  <button className="text-green-600 hover:text-green-700">
                    <Star size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full p-2 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              চ্যাট পরিষ্কার করুন
            </button>
            <div className="text-xs text-gray-500">
              Powered by Mukti AI
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmartChatbot;
