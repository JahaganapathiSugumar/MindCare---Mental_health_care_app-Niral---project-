import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getFirebaseInstance, ensureAuthInitialized } from '../firebase';

// Save chat message to Firestore
export const saveChatMessage = async (message, response) => {
  const auth = await ensureAuthInitialized();
  const { db } = getFirebaseInstance();

  if (!auth?.currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const userId = auth.currentUser.uid;

  try {
    const chatsRef = collection(db, 'chats');
    const docRef = await addDoc(chatsRef, {
      userId,
      message,
      response,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });

    console.log('[ChatService] Message saved with ID:', docRef.id);
    return {
      id: docRef.id,
      userId,
      message,
      response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ChatService] Error saving chat:', error.message);
    throw error;
  }
};

// Fetch chat history from Firestore
export const fetchChatHistory = async (userId) => {
  const { db } = getFirebaseInstance();

  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  try {
    const chatsRef = collection(db, 'chats');
    let chatsQuery;

    try {
      // Try with orderBy (preferred)
      chatsQuery = query(
        chatsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'asc')
      );
    } catch (_error) {
      // Fallback without orderBy
      console.warn('[ChatService] OrderBy not available, using fallback');
      chatsQuery = query(chatsRef, where('userId', '==', userId));
    }

    const snap = await getDocs(chatsQuery);
    const chats = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by timestamp if fallback was used
    return chats.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(a.createdAt);
      const bTime = b.timestamp?.toDate?.() || new Date(b.createdAt);
      return aTime.getTime() - bTime.getTime();
    });
  } catch (error) {
    console.error('[ChatService] Error fetching chat history:', error.message);
    throw error;
  }
};

// Convert chat history to GiftedChat format
export const convertToGiftedChatFormat = (chats, userEmail = '') => {
  const messages = [];

  chats.forEach((chat) => {
    // User message
    if (chat.message) {
      messages.push({
        _id: `${chat.id}-user`,
        text: chat.message,
        createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
        user: {
          _id: chat.userId,
          name: userEmail || 'You',
          avatar: null,
        },
        sent: true,
        received: true,
      });
    }

    // AI response
    if (chat.response) {
      messages.push({
        _id: `${chat.id}-ai`,
        text: chat.response,
        createdAt: chat.timestamp?.toDate?.() || new Date(chat.createdAt),
        user: {
          _id: 'ai-assistant',
          name: 'AI Assistant',
          avatar: '🤖',
        },
        sent: true,
        received: true,
      });
    }
  });

  return messages.reverse(); // GiftedChat expects newest first
};
