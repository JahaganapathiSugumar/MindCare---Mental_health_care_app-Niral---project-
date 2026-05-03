"""
Integration Guide: Mobile App ↔ RAG Backend

This module demonstrates how to integrate the RAG system API 
with the React Native mobile application.
"""

# =============================================================================
# 1. CONFIGURE API ENDPOINT IN MOBILE APP
# =============================================================================

# File: services/api.js or services/apiService.js

"""
const RAG_API_BASE_URL = process.env.RAG_API_URL || 'http://your-server:5000';

// Chat with RAG context
export async function chatWithRAG(message, userId = 'anonymous') {
  try {
    const response = await fetch(`${RAG_API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.trim(),
        user_id: userId,
        top_k: 3,
        use_cache: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('RAG chat error:', error);
    throw error;
  }
}

// Get context without AI response
export async function retrieveContext(query, topK = 3) {
  try {
    const response = await fetch(`${RAG_API_BASE_URL}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        top_k: topK,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Retrieval error:', error);
    throw error;
  }
}

// Get system stats
export async function getRAGStats() {
  try {
    const response = await fetch(`${RAG_API_BASE_URL}/stats`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Stats error:', error);
    return null;
  }
}

// Get user chat history
export async function getChatHistory(userId, limit = 10) {
  try {
    const response = await fetch(
      `${RAG_API_BASE_URL}/history/${userId}?limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('History error:', error);
    return null;
  }
}
"""

# =============================================================================
# 2. USE RAG IN CHATSCREEN.JS
# =============================================================================

"""
// File: screens/ChatScreen.js

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { chatWithRAG, getChatHistory } from '../services/api';

export default function ChatScreen({ userId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [ragInfo, setRagInfo] = useState(null);

  useEffect(() => {
    // Load chat history
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(userId, 10);
      if (history && history.history) {
        // Transform Firebase format to chat format
        const chatMessages = history.history.map(log => ({
          id: log.timestamp,
          text: log.message,
          sender: 'user',
          timestamp: log.timestamp,
        })).concat(
          history.history.map(log => ({
            id: log.timestamp + '_response',
            text: log.response,
            sender: 'ai',
            timestamp: log.timestamp,
            context_used: log.context_used,
          }))
        );
        setMessages(chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message to UI
    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    setLoading(true);
    try {
      // Call RAG API
      const response = await chatWithRAG(userMessage.text, userId);

      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        text: response.response,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        context_used: response.context_used,
        relevance_scores: response.relevance_scores,
        retrieval_time_ms: response.retrieval_time_ms,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Store RAG info for display
      setRagInfo({
        context_count: response.context_used.length,
        avg_relevance: response.relevance_scores?.length > 0
          ? (response.relevance_scores.reduce((a, b) => a + b) / response.relevance_scores.length).toFixed(2)
          : 0,
        retrieval_time: response.retrieval_time_ms.toFixed(0),
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message to user
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I had trouble processing your message. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Messages List */}
      <ScrollView style={styles.messagesContainer}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.message, msg.sender === 'user' ? styles.userMessage : styles.aiMessage]}>
            <Text style={styles.messageText}>{msg.text}</Text>
            {msg.context_used && (
              <Text style={styles.metaText}>
                🔍 {msg.context_used.length} sources | ⚡ {msg.retrieval_time}ms
              </Text>
            )}
          </View>
        ))}
        {loading && <ActivityIndicator size="large" />}
      </ScrollView>

      {/* RAG Info */}
      {ragInfo && (
        <View style={styles.ragInfo}>
          <Text style={styles.ragText}>
            Context: {ragInfo.context_count} | Relevance: {ragInfo.avg_relevance} | Time: {ragInfo.retrieval_time}ms
          </Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 12,
  },
  message: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  ragInfo: {
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  ragText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
"""

# =============================================================================
# 3. ENVIRONMENT CONFIGURATION
# =============================================================================

"""
Create .env file in project root:

# Backend API
RAG_API_URL=http://localhost:5000
# For production:
# RAG_API_URL=https://api.your-domain.com

# Enable RAG features
ENABLE_RAG_CHAT=true
RAG_RETRIEVAL_TOP_K=3
RAG_CACHE_RESPONSES=true
"""

# =============================================================================
# 4. NETWORK CONFIGURATION FOR ANDROID
# =============================================================================

"""
For local development testing on Android, add to android/app/src/main/AndroidManifest.xml:

<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">192.168.1.x</domain>
</domain-config>

For production (https), this is not needed.
"""

# =============================================================================
# 5. RESPONSE HANDLING PATTERNS
# =============================================================================

"""
// Pattern 1: RAG Response with Context
const ragResponse = {
  response: "CBT principles suggest that...",
  context_used: ["chunk_123", "chunk_456"],
  relevance_scores: [0.95, 0.87],
  sections_used: ["Anxiety Management", "Coping Techniques"],
  model: "gpt-4",
  retrieval_time_ms: 45.2,
  total_time_ms: 1250.5,
  from_cache: false
};

// Pattern 2: Displaying Context Sources in UI
const renderContextBadges = (contextIds, relevanceScores) => {
  return contextIds.map((id, idx) => (
    <View key={id} style={styles.contextBadge}>
      <Text style={styles.contextText}>
        📚 Source {idx + 1} ({(relevanceScores[idx] * 100).toFixed(0)}% match)
      </Text>
    </View>
  ));
};

// Pattern 3: Error Handling
try {
  const response = await chatWithRAG(message);
  // Use response
} catch (error) {
  if (error.message.includes('503')) {
    showMessage('RAG system is initializing. Please try again.');
  } else if (error.message.includes('504')) {
    showMessage('Request timeout. Please try again.');
  } else {
    showMessage('Failed to process message. Please try again.');
  }
}
"""

# =============================================================================
# 6. PERFORMANCE OPTIMIZATION
# =============================================================================

"""
// Debounce typing to avoid too many API calls
import { debounce } from 'lodash';

const handleTyping = debounce(async (text) => {
  // Only retrieve context for longer messages
  if (text.length > 20) {
    const context = await retrieveContext(text);
    updateContextPreview(context.results);
  }
}, 500);

// Batch requests
const sendMultipleMessages = async (messages) => {
  const results = await Promise.all(
    messages.map(msg => chatWithRAG(msg))
  );
  return results;
};

// Cache responses in AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const cacheResponse = async (query, response) => {
  await AsyncStorage.setItem(
    `rag_response_${query}`,
    JSON.stringify(response)
  );
};

const getCachedResponse = async (query) => {
  const cached = await AsyncStorage.getItem(`rag_response_${query}`);
  return cached ? JSON.parse(cached) : null;
};
"""

# =============================================================================
# 7. TESTING & DEBUGGING
# =============================================================================

"""
// Debug helper to see RAG system status
export async function debugRAGSystem() {
  console.log('=== RAG System Debug ===');
  
  try {
    // Test connectivity
    const health = await fetch('http://localhost:5000/health');
    console.log('Health:', await health.json());

    // Test retrieval
    const retrieve = await fetch('http://localhost:5000/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', top_k: 1 }),
    });
    console.log('Retrieval:', await retrieve.json());

    // Test stats
    const stats = await fetch('http://localhost:5000/stats');
    console.log('Stats:', await stats.json());
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Add to app for testing:
if (__DEV__) {
  global.debugRAG = debugRAGSystem;
  console.log('Debug: Call debugRAG() in console to test RAG system');
}
"""

# =============================================================================
# 8. DEPLOYMENT CHECKLIST
# =============================================================================

"""
BEFORE DEPLOYING TO PRODUCTION:

Mobile App:
- [ ] Update RAG_API_URL to production endpoint
- [ ] Enable HTTPS certificate pinning
- [ ] Add request timeout (e.g., 30 seconds)
- [ ] Implement retry logic with exponential backoff
- [ ] Add user feedback for slow responses
- [ ] Cache responses locally
- [ ] Monitor API error rates

Backend:
- [ ] Deploy Flask app to production server
- [ ] Setup HTTPS with valid certificate
- [ ] Configure CORS for mobile app domain
- [ ] Setup authentication/API keys if needed
- [ ] Setup monitoring and alerting
- [ ] Setup log rotation
- [ ] Test with production FAISS index
- [ ] Configure Firebase credentials
- [ ] Load test the system
- [ ] Setup disaster recovery

Network:
- [ ] Configure firewall rules
- [ ] Setup rate limiting
- [ ] Enable request logging
- [ ] Setup CDN if needed
- [ ] Configure database backups
"""

print(__doc__)
