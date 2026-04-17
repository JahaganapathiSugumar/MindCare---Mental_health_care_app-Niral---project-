import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureAuthInitialized } from '../firebase';
import { sendMessageToAI } from '../services/apiService';
import { saveChatMessage, fetchChatHistory } from '../services/chatService';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const flatListRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const auth = await ensureAuthInitialized();
        if (auth?.currentUser) {
          const userId = auth.currentUser.uid;
          const email = auth.currentUser.email || 'User';
          
          setCurrentUser({ _id: userId });
          setUserEmail(email);

          const chatHistory = await fetchChatHistory(userId);
          // Convert to message format
          const formattedMessages = [];
          chatHistory.forEach((chat) => {
            if (chat.message) {
              formattedMessages.push({
                _id: `${chat.id}-user`,
                text: chat.message,
                createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
                sender: 'user',
                senderName: email,
              });
            }
            if (chat.response) {
              formattedMessages.push({
                _id: `${chat.id}-ai`,
                text: chat.response,
                createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
                sender: 'ai',
                senderName: 'AI Assistant',
              });
            }
          });
          // Reverse to show newest last
          setMessages(formattedMessages.reverse());
        }
      } catch (error) {
        console.error('[ChatScreen] Load history error:', error.message);
        Alert.alert('Error', 'Could not load chat history. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending || !currentUser) return;

    const userMessage = {
      _id: Math.random().toString(36).substring(7),
      text: inputText.trim(),
      createdAt: new Date(),
      sender: 'user',
      senderName: userEmail,
    };

    setInputText('');
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      // Call backend AI endpoint
      const result = await sendMessageToAI(currentUser._id, userMessage.text);

      if (result.success) {
        // Create AI response message
        const aiMessage = {
          _id: Math.random().toString(36).substring(7),
          text: result.response,
          createdAt: new Date(),
          sender: 'ai',
          senderName: 'AI Assistant',
        };

        // Add AI message
        setMessages((prev) => [...prev, aiMessage]);

        // Save conversation to Firestore
        try {
          await saveChatMessage(userMessage.text, result.response);
        } catch (saveError) {
          console.warn('[ChatScreen] Failed to save to Firestore:', saveError.message);
        }
      } else {
        // Show error message
        const errorMessage = {
          _id: Math.random().toString(36).substring(7),
          text: result.error || 'I\'m having trouble responding. Please try again.',
          createdAt: new Date(),
          sender: 'ai',
          senderName: 'AI Assistant',
        };

        setMessages((prev) => [...prev, errorMessage]);
        Alert.alert('AI Response Error', result.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('[ChatScreen] Send error:', error);
      Alert.alert('Error', 'Failed to send message. Please check your connection.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, currentUser, userEmail]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FAFF' }}>
        <ActivityIndicator size="large" color="#2A7FBF" />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FAFF' }}>
        <ActivityIndicator size="large" color="#2A7FBF" />
      </SafeAreaView>
    );
  }

  // Render message bubble
  const renderMessage = ({ item }) => {
    const isUserMessage = item.sender === 'user';
    
    return (
      <View style={[styles.messageBubbleContainer, isUserMessage ? styles.userContainer : styles.aiContainer]}>
        <View style={[styles.messageBubble, isUserMessage ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUserMessage ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isUserMessage ? styles.userTimestamp : styles.aiTimestamp]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Support Assistant</Text>
          <Text style={styles.headerSubtitle}>Mental Health Support</Text>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          scrollEnabled
          showsVerticalScrollIndicator={false}
        />

        {/* Typing Indicator */}
        {sending && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>🤖 AI is typing...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (sending || !inputText.trim()) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C415F',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6A879D',
    marginTop: 2,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#2A7FBF',
    marginRight: 8,
  },
  aiBubble: {
    backgroundColor: '#E8F4FF',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1C415F',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  userTimestamp: {
    color: '#B8D9F0',
  },
  aiTimestamp: {
    color: '#8FBBD9',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E8F4FF',
  },
  typingText: {
    color: '#2A7FBF',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E8F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C415F',
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2A7FBF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#8FBBD9',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default ChatScreen;
