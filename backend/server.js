require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

const AI_PROVIDER = (process.env.AI_PROVIDER || '').trim().toLowerCase() || (process.env.GROQ_API_KEY ? 'groq' : 'openai');
const IS_GROQ = AI_PROVIDER === 'groq';
const PROVIDER_LABEL = IS_GROQ ? 'Groq' : 'OpenAI';
const MODEL = process.env.AI_MODEL || (IS_GROQ ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant') : 'gpt-4o-mini');
const API_KEY = IS_GROQ ? (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) : (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
const BASE_URL = IS_GROQ ? (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1') : process.env.OPENAI_BASE_URL;
const MOOD_LABELS = ['happy', 'sad', 'neutral', 'anxious'];
const LANGUAGE_NAMES = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  ml: 'Malayalam',
};

const resolveLanguageCode = (input) => {
  const normalized = String(input || '').trim().toLowerCase();
  return LANGUAGE_NAMES[normalized] ? normalized : 'en';
};

const getLanguageName = (code) => LANGUAGE_NAMES[resolveLanguageCode(code)] || 'English';

const FALLBACK_SUGGESTIONS = {
  anxious: [
    'Try a 4-7-8 breathing exercise for 2 minutes',
    'Step outside for fresh air and a slow walk',
    'Ground yourself by naming 5 things you can see',
  ],
  sad: [
    'Write down what you are feeling in one short note',
    'Drink water and stretch for 3 minutes',
    'Reach out to someone you trust with one message',
  ],
  happy: [
    'Capture this moment in a gratitude note',
    'Take a short mindful walk to keep momentum',
    'Share one positive thing with someone close',
  ],
  neutral: [
    'Take three slow deep breaths',
    'Do a 2-minute body scan check-in',
    'Write one line about how your day is going',
  ],
};

const sanitizeInsightLines = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  return rawText
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .map((line) => (line.length > 120 ? `${line.slice(0, 117).trim()}...` : line))
    .slice(0, 3);
};

const buildFallbackInsights = ({ moods = [], chats = [], language = 'en' } = {}) => {
  const languageCode = resolveLanguageCode(language);
  const insights = [];

  if (moods.length >= 3) {
    const scoreMap = { happy: 4, neutral: 3, sad: 2, anxious: 1 };
    const scores = moods
      .map((item) => scoreMap[(item.mood || '').toLowerCase()] || 2.5)
      .filter((value) => typeof value === 'number');

    if (scores.length >= 3) {
      const first = scores[scores.length - 1];
      const latest = scores[0];
      if (latest > first) {
        insights.push(languageCode === 'ta' ? 'சமீப நாட்களில் உங்கள் மனநிலை மேம்பட்டுள்ளது.'
          : languageCode === 'hi' ? 'हाल के दिनों में आपका मूड बेहतर हुआ है।'
            : languageCode === 'ml' ? 'അടുത്തിടെ നിങ്ങളുടെ മൂഡ് മെച്ചപ്പെട്ടതായി തോന്നുന്നു.'
              : 'Your mood appears to improve over recent days.');
      } else if (latest < first) {
        insights.push(languageCode === 'ta' ? 'சமீப மனநிலை போக்கு சற்று குறைந்துள்ளது.'
          : languageCode === 'hi' ? 'हाल की आपकी मूड ट्रेंड थोड़ी कम हुई है।'
            : languageCode === 'ml' ? 'സമീപകാല മൂഡ് ട്രെൻഡ് അല്പം താഴ്ന്നിട്ടുണ്ട്.'
              : 'Your recent mood trend has dipped slightly.');
      } else {
        insights.push(languageCode === 'ta' ? 'சமீபத்தில் உங்கள் மனநிலை நிலைத்துள்ளது.'
          : languageCode === 'hi' ? 'हाल ही में आपका मूड स्थिर रहा है।'
            : languageCode === 'ml' ? 'സമീപകാലത്ത് നിങ്ങളുടെ മൂഡ് സ്ഥിരതയിലായിരുന്നു.'
              : 'Your mood trend has been steady recently.');
      }
    }
  }

  if (chats.length >= 4) {
    insights.push(languageCode === 'ta' ? 'நீங்கள் அரட்டையின் மூலம் தொடர்ச்சியாக செக்-இன் செய்கிறீர்கள்.'
      : languageCode === 'hi' ? 'आप चैट के माध्यम से लगातार चेक-इन कर रहे हैं।'
        : languageCode === 'ml' ? 'നിങ്ങൾ ചാറ്റ് വഴി സ്ഥിരമായി ചെക്ക്-ഇൻ ചെയ്യുന്നു.'
          : 'You have been checking in consistently through chat.');
  } else if (chats.length > 0) {
    insights.push(languageCode === 'ta' ? 'சிறிய, வழக்கமான அரட்டைகள் உணர்ச்சி தெளிவை மேம்படுத்த உதவும்.'
      : languageCode === 'hi' ? 'छोटी और नियमित चैट्स भावनात्मक स्पष्टता बनाए रखने में मदद कर सकती हैं।'
        : languageCode === 'ml' ? 'ചെറിയ സ്ഥിരം ചാറ്റുകൾ മാനസിക വ്യക്തത നിലനിർത്താൻ സഹായിക്കും.'
          : 'Short, regular chats may help you maintain emotional clarity.');
  }

  if (moods.length > 0) {
    const byMood = moods.reduce((acc, item) => {
      const key = (item.mood || 'neutral').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topMood = Object.keys(byMood).sort((a, b) => byMood[b] - byMood[a])[0];
    if (topMood) {
      insights.push(languageCode === 'ta' ? `சமீபத்தில் அதிகமாக இருந்த மனநிலை ${topMood}.`
        : languageCode === 'hi' ? `हाल में आपकी सबसे सामान्य भावना ${topMood} रही है।`
          : languageCode === 'ml' ? `സമീപകാലത്ത് കൂടുതലായി കണ്ട മൂഡ് ${topMood} ആണ്.`
            : `Your most common recent mood is ${topMood}.`);
    }
  }

  return insights.slice(0, 3);
};

// Middleware
app.use(cors());
app.use(express.json());

// LLM Provider Configuration (Groq via OpenAI-compatible API, or OpenAI)
const openai = new OpenAI({
  apiKey: API_KEY,
  ...(BASE_URL ? { baseURL: BASE_URL } : {}),
});

// System prompt for mental health assistant
const SYSTEM_PROMPT = `You are a supportive and empathetic mental health assistant. Your role is to provide compassionate, non-judgmental support using CBT (Cognitive Behavioral Therapy) principles and techniques.

IMPORTANT GUIDELINES:
1. Be empathetic and validate the person's feelings
2. Use active listening techniques
3. Ask thoughtful follow-up questions
4. Provide coping strategies and techniques when appropriate
5. Use CBT approaches like identifying thoughts, feelings, and behaviors
6. Do NOT provide medical diagnosis or prescribe medication
7. Do NOT replace professional mental health treatment
8. If the person expresses severe distress or suicidal thoughts, recommend immediate professional help

TONE: Warm, understanding, and professional.`;

const detectMoodFromMessage = async (message) => {
  try {
    const moodResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Classify the user emotion into exactly one label: happy, sad, neutral, anxious. Return only the label in lowercase.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0,
      max_tokens: 8,
      top_p: 1,
    });

    const rawMood = (moodResponse?.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const normalizedMood = rawMood.replace(/[^a-z]/g, '');

    if (MOOD_LABELS.includes(normalizedMood)) {
      return normalizedMood;
    }

    return 'neutral';
  } catch (error) {
    console.warn('[Mood Detection] Falling back to neutral:', error?.message || error);
    return 'neutral';
  }
};

const parseSuggestionLines = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  return rawText
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .map((line) => line.length > 90 ? `${line.slice(0, 87).trim()}...` : line)
    .slice(0, 3);
};

const getFallbackSuggestions = (mood) => {
  const normalizedMood = (mood || '').toLowerCase();
  return (FALLBACK_SUGGESTIONS[normalizedMood] || FALLBACK_SUGGESTIONS.neutral).slice(0, 3);
};

const generateSuggestionsFromMessage = async (message, mood, language = 'en') => {
  const normalizedMood = MOOD_LABELS.includes((mood || '').toLowerCase()) ? mood.toLowerCase() : 'neutral';
  const languageName = getLanguageName(language);

  try {
    const suggestionResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Based on this message and mood, suggest 2 or 3 simple mental wellness actions. Return each suggestion on a new line. Keep each suggestion short, practical, and supportive. Respond strictly in ${languageName}.`,
        },
        {
          role: 'user',
          content: `Mood: ${normalizedMood}\nMessage: ${message}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 120,
      top_p: 1,
    });

    const rawText = suggestionResponse?.choices?.[0]?.message?.content || '';
    const parsed = parseSuggestionLines(rawText);

    if (parsed.length >= 2) {
      return parsed;
    }

    return getFallbackSuggestions(normalizedMood);
  } catch (error) {
    console.warn('[Suggestions] Falling back to static suggestions:', error?.message || error);
    return getFallbackSuggestions(normalizedMood);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mental health chat backend is running' });
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: `Missing API key. Set ${IS_GROQ ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} in backend/.env.`,
      });
    }

    const { userId, message, language = 'en' } = req.body;
    const languageName = getLanguageName(language);

    // Validate input
    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: userId and message',
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message must be a non-empty string',
      });
    }

    // Rate limiting (basic: 10 requests per minute per user)
    // In production, use Redis or similar for proper rate limiting
    console.log(`[${new Date().toISOString()}] Chat request from user: ${userId}`);

    const prompt = `
You are a supportive mental health assistant.
Respond ONLY in ${languageName}.
Be empathetic and simple.

User: ${message.trim()}
`;

    // Run response generation and emotion classification together.
    const [response, detectedMood] = await Promise.all([
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.95,
      }),
      detectMoodFromMessage(message.trim()),
    ]);

    const suggestions = await generateSuggestionsFromMessage(message.trim(), detectedMood, language);

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error(`[${PROVIDER_LABEL}] Empty response from API`);
      return res.status(500).json({
        error: 'Failed to generate response from AI',
      });
    }

    console.log(`[${new Date().toISOString()}] Response generated for user: ${userId}`);

    // Return response
    res.json({
      response: aiResponse,
      mood: detectedMood,
      suggestions,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ERROR]', error);

    const status = error?.status || error?.response?.status;
    const errorCode =
      error?.code ||
      error?.error?.code ||
      error?.response?.data?.error?.code;

    // Handle provider/API errors
    if (status === 429 || errorCode === 'insufficient_quota' || errorCode === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: `${PROVIDER_LABEL} API rate limited. Please try again later.`,
      });
    }

    if (status === 401 || errorCode === 'invalid_api_key' || errorCode === 'authentication_error') {
      return res.status(401).json({
        error: 'Authentication error with AI service. Please contact support.',
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Failed to process your message. Please try again later.',
    });
  }
});

app.post('/insights/analyze', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: `Missing API key. Set ${IS_GROQ ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} in backend/.env.`,
      });
    }

    const { userId, moods = [], chats = [], language = 'en' } = req.body || {};
    const languageName = getLanguageName(language);

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId',
      });
    }

    const normalizedMoods = Array.isArray(moods) ? moods.slice(0, 80) : [];
    const normalizedChats = Array.isArray(chats) ? chats.slice(0, 120) : [];

    if (!normalizedMoods.length && !normalizedChats.length) {
      return res.json({
        insights: [
          languageName === 'Tamil'
            ? 'மேலும் அர்த்தமுள்ள பார்வைகளுக்கு சில செக்-இன்களையும் அரட்டைகளையும் சேர்க்கவும்.'
            : languageName === 'Hindi'
              ? 'और अर्थपूर्ण इनसाइट्स के लिए कुछ और चेक-इन और चैट जोड़ें।'
              : languageName === 'Malayalam'
                ? 'കൂടുതൽ അർത്ഥമുള്ള ഇൻസൈറ്റുകൾക്കായി കുറച്ച് ചെക്ക്-ഇനും ചാറ്റുകളും ചേർക്കുക.'
                : 'Add a few check-ins and chats so I can generate more meaningful insights.',
        ],
      });
    }

    const promptPayload = {
      moods: normalizedMoods.map((item) => ({
        mood: item?.mood || 'neutral',
        createdAt: item?.createdAt || null,
      })),
      chats: normalizedChats.map((item) => ({
        createdAt: item?.createdAt || null,
        detectedMood: item?.detectedMood || 'neutral',
        messagePreview: String(item?.message || '').slice(0, 120),
      })),
    };

    const insightResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Analyze this user's mood data and generate 2-3 short insights. Keep each insight supportive, specific, and under 120 characters. Return one insight per line. Respond strictly in ${languageName}.`,
        },
        {
          role: 'user',
          content: JSON.stringify(promptPayload),
        },
      ],
      temperature: 0.35,
      max_tokens: 180,
      top_p: 1,
    });

    const rawText = insightResponse?.choices?.[0]?.message?.content || '';
    const parsed = sanitizeInsightLines(rawText);
    const insights = parsed.length >= 2
      ? parsed
      : buildFallbackInsights({ moods: normalizedMoods, chats: normalizedChats, language });

    return res.json({
      insights: insights.slice(0, 3),
    });
  } catch (error) {
    console.error('[Insights Error]', error);

    const status = error?.status || error?.response?.status;
    const errorCode =
      error?.code ||
      error?.error?.code ||
      error?.response?.data?.error?.code;

    if (status === 429 || errorCode === 'rate_limit_exceeded') {
      return res.status(429).json({ error: 'Insights service is temporarily busy. Please try again soon.' });
    }

    if (status === 401 || errorCode === 'authentication_error') {
      return res.status(401).json({ error: 'Insights authentication failed.' });
    }

    return res.status(500).json({ error: 'Could not generate insights at this time.' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

// Start server with automatic fallback if a port is already occupied.
const MAX_PORT_RETRIES = 10;

const startServer = (startPort) => {
  const portNumber = Number(startPort);
  const safeStartPort = Number.isFinite(portNumber) ? portNumber : 5000;

  const tryListen = (port, attempt = 0) => {
    const server = app.listen(port, () => {
      console.log(`🚀 Mental health chat backend running on http://localhost:${port}`);
      console.log(`✓ Provider: ${PROVIDER_LABEL}`);
      console.log(`✓ Model: ${MODEL}`);
      console.log(`✓ API Key configured: ${API_KEY ? 'Yes' : 'No'}`);
      console.log(`✓ Health check: GET http://localhost:${port}/health`);
      console.log(`✓ Chat endpoint: POST http://localhost:${port}/chat`);
      if (port !== safeStartPort) {
        console.warn(`⚠ Port ${safeStartPort} was busy, using ${port} instead.`);
      }
    });

    server.on('error', (error) => {
      if (error?.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES) {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use, retrying on ${nextPort}...`);
        tryListen(nextPort, attempt + 1);
        return;
      }

      console.error('[Startup Error]', error);
      process.exit(1);
    });
  };

  tryListen(safeStartPort);
};

startServer(PORT);

module.exports = app;
