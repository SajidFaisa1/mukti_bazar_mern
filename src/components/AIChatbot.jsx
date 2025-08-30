import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, X, Lightbulb } from 'lucide-react';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      content: 'আসসালামু আলাইকুম! Welcome to Mukti Bazar! আমি একটি স্মার্ট সহায়ক। কিভাবে সাহায্য করতে পারি? 🌾',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  
  const clientAuth = useClientAuth();
  const vendorAuth = useVendorAuth();
  
  // Determine user role and info
  const getCurrentUser = () => {
    if (vendorAuth.user) return { ...vendorAuth.user, role: 'vendor' };
    if (clientAuth.user) return { ...clientAuth.user, role: 'client' };
    return { role: 'client' }; // Default for guest users
  };

  const currentUser = getCurrentUser();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load suggestions based on user role
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, currentUser.role]);

  const loadSuggestions = async () => {
    try {
      const response = await fetch(`http://localhost:5005/api/chat/suggestions?userRole=${currentUser.role}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const sendMessage = async (messageContent) => {
    if (!messageContent.trim()) return;

    const userMessage = {
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5005/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          userRole: currentUser.role,
          uid: currentUser.uid || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = {
          type: 'ai',
          content: data.message,
          timestamp: new Date(),
          metadata: data.metadata
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        type: 'ai',
        content: 'দুঃখিত! I\'m having technical difficulties. Please try again or contact support. 🔧',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        className={`chat-float-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
        <span className="chat-badge">AI</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chatbot-container">
          <div className="chatbot-header">
            <div className="header-info">
              <Bot size={20} />
              <div>
                <h4>Mukti Bazar AI সহায়ক</h4>
                <span className="user-role">
                  {currentUser.role === 'vendor' ? '🌾 Farmer/Producer' : 
                   currentUser.role === 'admin' ? '⚡ Administrator' : '🏪 Shop Owner'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="close-chat-btn"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.type} ${message.isError ? 'error' : ''}`}
              >
                <div className="message-avatar">
                  {message.type === 'ai' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.content}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('en-BD', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  {message.metadata && (
                    <div className="message-metadata">
                      Model: {message.metadata.model} • {message.metadata.tokens} tokens
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message ai loading">
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-content">
                  <div className="loading-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {suggestions.length > 0 && messages.length <= 1 && (
            <div className="chat-suggestions">
              <div className="suggestions-header">
                <Lightbulb size={16} />
                <span>Quick Questions:</span>
              </div>
              <div className="suggestions-list">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <button 
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="suggestion-btn"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="chatbot-input">
            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="আপনার প্রশ্ন লিখুন... (Type your question...)"
                disabled={isLoading}
                maxLength={500}
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="send-btn"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="chatbot-footer">
            <small>
              AI Assistant for agricultural marketplace 🌾 
              {currentUser.businessName && ` • ${currentUser.businessName}`}
            </small>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
