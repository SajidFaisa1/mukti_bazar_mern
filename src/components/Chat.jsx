import React, { useState, useEffect } from 'react';
import { getChatResponse, getChatHistory, clearChatHistory } from '../services/chatService';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId] = useState(Math.random().toString(36).substring(7));

  useEffect(() => {
    // Load chat history when component mounts
    const history = getChatHistory(userId);
    setMessages(history);
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to state
      setMessages(prev => [...prev, { role: 'user', content: input }]);
      
      // Show loading state
      setLoading(true);
      setError(null);
      
      // Get AI response
      const response = await getChatResponse(userId, input);
      
      // Add AI response to state
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setInput('');
    } catch (error) {
      // Add error message to chat
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: error.message 
      }]);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    clearChatHistory(userId);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2 className='chat-title'>কৃষি সহায়তা চ্যাট</h2>
        <button onClick={handleClearChat} className="clear-chat-btn">
          চ্যাট পরিষ্কার করুন
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার প্রশ্ন লিখুন..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'প্রসেস করা হচ্ছে...' : 'প্রশ্ন করুন'}
        </button>
      </form>
    </div>
  );
};

export default Chat;
