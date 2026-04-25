import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../i18n';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_API_URL;

const getExpoHost = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return '';
  }

  return hostUri.split(':')[0];
};

const resolveApiBaseUrl = () => {
  if (ENV_API_URL && typeof ENV_API_URL === 'string') {
    return ENV_API_URL;
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    return `http://${expoHost}:5000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

const API_BASE_URL = resolveApiBaseUrl();

console.log('[API] Using base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let insightsEndpointUnavailable = false;

// Send message to AI backend
export const sendMessageToAI = async (userId, message, language = i18n.language || 'en') => {
  try {
    const response = await apiClient.post('/chat', {
      userId,
      message,
      language,
    });

    if (response.status === 200 && response.data?.response) {
      return {
        success: true,
        response: response.data.response,
        mood: response.data.mood || 'neutral',
        suggestions: Array.isArray(response.data.suggestions) ? response.data.suggestions : [],
        crisis: response.data.crisis || {
          detected: false,
          level: 'none',
          showEmergencyAlert: false,
          recommendProfessionalHelp: false,
          keywordHits: [],
          score: 0,
        },
      };
    }

    throw new Error('Invalid response format from server');
  } catch (error) {
    console.error('[API] Error sending message:', error.message);
    
    if (error.response?.status === 429) {
      return {
        success: false,
        error: i18n.t('api.tooManyRequests'),
      };
    }

    if (error.response?.status === 500) {
      return {
        success: false,
        error: i18n.t('api.serverError'),
      };
    }

    if (error.response?.status === 401) {
      return {
        success: false,
        error: i18n.t('api.authFailed'),
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: i18n.t('api.timeout'),
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || i18n.t('api.failed'),
    };
  }
};

export const fetchDailyReflections = async (userId, limit = 5) => {
  try {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(20, limit)) : 5;
    const response = await apiClient.get(`/reflections/${userId}?limit=${safeLimit}`);

    if (response.status === 200) {
      return {
        success: true,
        reflections: Array.isArray(response.data?.reflections) ? response.data.reflections : [],
      };
    }

    throw new Error('Invalid reflection response format');
  } catch (error) {
    console.warn('[API] Error fetching reflections:', error.message);
    return {
      success: false,
      reflections: [],
      error: error.response?.data?.error || 'Failed to fetch reflections',
    };
  }
};

export const runAgentEvaluation = async (userId, language = i18n.language || 'en') => {
  try {
    const response = await apiClient.post('/agents/evaluate', {
      userId,
      language,
    });

    if (response.status === 200) {
      return {
        success: true,
        result: response.data || {},
      };
    }

    throw new Error('Invalid agent evaluation response');
  } catch (error) {
    console.warn('[API] Agent evaluation failed:', error.message);
    return {
      success: false,
      result: {},
      error: error.response?.data?.error || 'Agent evaluation failed',
    };
  }
};

export const generateAIInsights = async (userId, moods = [], chats = [], language = i18n.language || 'en') => {
  if (insightsEndpointUnavailable) {
    return {
      success: false,
      error: 'Insights endpoint is not available on the current backend.',
      insights: [],
    };
  }

  try {
    let response;

    try {
      response = await apiClient.post('/insights/analyze', {
        userId,
        moods,
        chats,
        language,
      });
    } catch (primaryError) {
      if (primaryError?.response?.status === 404) {
        response = await apiClient.post('/insights', {
          userId,
          moods,
          chats,
          language,
        });
      } else {
        throw primaryError;
      }
    }

    if (response.status === 200) {
      return {
        success: true,
        insights: Array.isArray(response.data?.insights) ? response.data.insights : [],
      };
    }

    throw new Error('Invalid response format from insights endpoint');
  } catch (error) {
    if (error?.response?.status === 404) {
      insightsEndpointUnavailable = true;
      console.warn('[API] Insights endpoint not found on backend. Skipping AI insights calls.');
      return {
        success: false,
        error: i18n.t('api.insightsUnavailable'),
        insights: [],
      };
    }

    console.error('[API] Error generating insights:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || i18n.t('api.insightsFailed'),
      insights: [],
    };
  }
};

export default apiClient;
