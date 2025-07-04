import axios from 'axios';

// Initialize proxy API endpoint
const API_URL = 'http://localhost:5005/api/chat';

// Add error handling for API errors
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with an error status
    return error.response.data.error || 'An error occurred while processing your request';
  } else if (error.request) {
    // Request was made but no response was received
    return 'Could not connect to the server. Please try again later.';
  } else {
    // Something happened in setting up the request
    return 'An error occurred while processing your request. Please try again.';
  }
};

// Agriculture-specific prompts and context
const agricultureContext = `You are an expert in Bangladeshi agriculture. You can answer questions about:
1. Crop cultivation
2. Soil management
3. Pest control
4. Weather and climate impact
5. Irrigation
6. Fertilizers and pesticides
7. Market prices
8. Government policies
9. Best practices
10. Organic farming

Always respond in Bangla. Provide practical, localized advice specific to Bangladesh's agricultural conditions.`;

// Chat history storage
const chatHistory = new Map();

export const getChatResponse = async (userId, message) => {
  try {
    // Get or create user's chat history
    let history = chatHistory.get(userId) || [];
    
    // Add current message to history
    history.push({ role: 'user', content: message });
    
    // Prepare messages for API call
    const messages = [
      { role: 'system', content: agricultureContext },
      ...history
    ];

    // Call backend proxy
    const response = await axios.post(API_URL, { messages });

    // Get AI response
    if (!response.data || !response.data.success) {
      throw new Error('Invalid response from AI service: ' + response.data?.error || 'Unknown error');
    }
    
    const aiResponse = response.data.response;
    
    // Add AI response to history
    if (aiResponse) {
      history.push({ role: 'assistant', content: aiResponse });
      chatHistory.set(userId, history);
      return aiResponse;
    } else {
      throw new Error('No response received from AI service');
    }
  } catch (error) {
    console.error('Error in chat service:', error);
    
    // Get detailed error information
    let errorMessage = 'Sorry, I couldn\'t process your request. Please try again.';
    
    if (error.response) {
      // Server responded with an error status
      errorMessage += ` Server error: ${error.response.status} ${error.response.statusText}`;
      if (error.response.data) {
        errorMessage += ` Details: ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      // Request was made but no response was received
      errorMessage += ' Could not connect to the server. Please check if the server is running.';
    } else {
      // Something happened in setting up the request
      errorMessage += ` Request setup error: ${error.message}. Stack trace: ${error.stack}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Clear chat history for a user
export const clearChatHistory = (userId) => {
  chatHistory.delete(userId);
};

// Get chat history
export const getChatHistory = (userId) => {
  return chatHistory.get(userId) || [];
};
