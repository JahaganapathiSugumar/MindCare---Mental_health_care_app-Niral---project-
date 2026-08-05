import { getAuth_, getFirebaseInstance } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mood keywords mapping
const moodKeywords = {
    happy: ['happy', 'great', 'good', 'wonderful', 'amazing', 'excellent', 'fantastic', 'joy', 'excited', 'grateful', 'blessed', 'awesome', 'love', 'enjoy', 'best', 'nice', 'glad', 'cheerful', 'delighted', 'pleased', 'fantastic', 'terrific', 'outstanding', 'superb', 'brilliant'],
    anxious: ['anxious', 'nervous', 'worried', 'scared', 'fearful', 'stress', 'tense', 'panic', 'overwhelmed', 'concerned', 'uneasy', 'restless', 'frightened', 'terrified', 'apprehensive', 'distressed', 'unease', 'dread', 'angst'],
    sad: ['sad', 'down', 'depressed', 'lonely', 'cry', 'upset', 'heartbroken', 'hopeless', 'miserable', 'gloomy', 'melancholy', 'disappointed', 'devastated', 'grief', 'sorrow', 'despair', 'blue', 'low', 'unhappy'],
    neutral: ['okay', 'fine', 'alright', 'so-so', 'meh', 'neutral', 'normal', 'average', 'ok', 'alright', 'not bad']
};

// Extract mood from text using keyword matching
export const extractMoodFromText = (text) => {
    if (!text) return 'neutral';

    const lowerText = text.toLowerCase();
    let scores = { happy: 0, anxious: 0, sad: 0, neutral: 0 };

    // Count keyword occurrences
    Object.keys(moodKeywords).forEach(mood => {
        const keywords = moodKeywords[mood];
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                scores[mood] += 1;
            }
        });
    });

    // Find mood with highest score
    let maxScore = 0;
    let detectedMood = 'neutral';
    Object.keys(scores).forEach(mood => {
        if (scores[mood] > maxScore) {
            maxScore = scores[mood];
            detectedMood = mood;
        }
    });

    // If no keywords found, try simple sentiment analysis
    if (maxScore === 0) {
        const positiveWords = ['good', 'nice', 'great', 'awesome', 'like', 'love', 'best', 'happy', 'wonderful', 'amazing', 'excellent'];
        const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'wrong', 'worse', 'worst', 'sad', 'depressed', 'anxious', 'stress'];

        let positive = 0;
        let negative = 0;

        positiveWords.forEach(word => {
            if (lowerText.includes(word)) positive++;
        });

        negativeWords.forEach(word => {
            if (lowerText.includes(word)) negative++;
        });

        if (positive > negative) return 'happy';
        if (negative > positive) return 'sad';
        return 'neutral';
    }

    return detectedMood;
};

// Save mood to Firestore
export const saveMoodFromChat = async (message, userId) => {
    try {
        const mood = extractMoodFromText(message);
        const { db } = getFirebaseInstance();

        await addDoc(collection(db, 'moods'), {
            userId: userId,
            mood: mood,
            source: 'ai_chat',
            message: message.substring(0, 200), // Store first 200 chars
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString()
        });

        return mood;
    } catch (error) {
        console.error('Error saving mood from chat:', error);
        return null;
    }
};

// Analyze chat conversation and extract mood patterns
export const analyzeChatMood = async (messages) => {
    if (!messages || messages.length === 0) return null;

    const moodCounts = { happy: 0, neutral: 0, anxious: 0, sad: 0 };

    messages.forEach(msg => {
        if (msg.text) {
            const mood = extractMoodFromText(msg.text);
            if (moodCounts[mood] !== undefined) {
                moodCounts[mood]++;
            }
        }
    });

    // Find dominant mood
    let maxCount = 0;
    let dominantMood = 'neutral';
    Object.keys(moodCounts).forEach(mood => {
        if (moodCounts[mood] > maxCount) {
            maxCount = moodCounts[mood];
            dominantMood = mood;
        }
    });

    return {
        dominantMood,
        moodCounts,
        totalMessages: messages.length
    };
};