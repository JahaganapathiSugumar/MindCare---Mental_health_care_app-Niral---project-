import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.52:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Send message to AI backend
export const sendMessageToAI = async (userId, message) => {
  try {
    const response = await apiClient.post('/chat', {
      userId,
      message,
    });

    if (response.status === 200 && response.data?.response) {
      return {
        success: true,
        response: response.data.response,
      };
    }

    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('[API] Error sending message:', error.message);
    
    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
      };
    }

    if (error.response?.status === 500) {
      return {
        success: false,
        error: 'Server error. Please try again later.',
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get response from AI. Please try again.',
    };
  }
};

export default apiClient;
