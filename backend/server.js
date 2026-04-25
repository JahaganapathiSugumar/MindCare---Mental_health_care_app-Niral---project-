require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const cron = require('node-cron');
const admin = require('firebase-admin');
const axios = require('axios');
const {
  calculateMoodRecovery,
  buildDailySummaryPrompt,
  getTimeWindow24Hours,
  toISO,
} = require('./report_generator');

const app = express();
const PORT = process.env.PORT || 5000;

const AI_PROVIDER = (process.env.AI_PROVIDER || '').trim().toLowerCase() || (process.env.GROQ_API_KEY ? 'groq' : 'openai');
const IS_GROQ = AI_PROVIDER === 'groq';
const PROVIDER_LABEL = IS_GROQ ? 'Groq' : 'OpenAI';
const MODEL = process.env.AI_MODEL || (IS_GROQ ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant') : 'gpt-4o-mini');
const API_KEY = IS_GROQ ? (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) : (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
const BASE_URL = IS_GROQ ? (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1') : process.env.OPENAI_BASE_URL;
const MOOD_LABELS = ['happy', 'sad', 'neutral', 'anxious'];
const CRISIS_KEYWORDS = [
  'hopeless',
  'worthless',
  'want to die',
  'kill myself',
  'end my life',
  'suicide',
  'self harm',
  'self-harm',
  'no reason to live',
  'i cannot go on',
];
const STRONG_NEGATIVE_TERMS = [
  'broken',
  'empty',
  'trapped',
  'panic',
  'terrified',
  'exhausted',
  'alone',
  'numb',
  'helpless',
];
const MOOD_SCORE_MAP = { anxious: 1, sad: 2, neutral: 3, happy: 4 };
const AGENT_TIMEZONE = process.env.AGENT_TIMEZONE || 'Asia/Kolkata';
const REFLECTION_HOUR = Number.isFinite(Number(process.env.REFLECTION_HOUR)) ? Number(process.env.REFLECTION_HOUR) : 21;
const INACTIVITY_CHECK_HOURS = Number.isFinite(Number(process.env.INACTIVITY_CHECK_HOURS)) ? Number(process.env.INACTIVITY_CHECK_HOURS) : 24;
const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
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

const getLanguageCode = (input) => resolveLanguageCode(input);

const normalizeText = (value) => String(value || '').toLowerCase();

const computeNegativeSignalScore = (message) => {
  const text = normalizeText(message);
  const keywordHits = CRISIS_KEYWORDS.filter((word) => text.includes(word));
  const negativeHits = STRONG_NEGATIVE_TERMS.filter((word) => text.includes(word));
  const punctuationIntensity = (text.match(/[!?]{2,}/g) || []).length;
  const score = keywordHits.length * 3 + negativeHits.length + punctuationIntensity;
  return {
    score,
    keywordHits,
    negativeHits,
  };
};

const analyzeCrisisSignal = (message) => {
  const analysis = computeNegativeSignalScore(message);
  const hasCriticalKeyword = analysis.keywordHits.some((hit) => hit.includes('die') || hit.includes('kill') || hit.includes('suicide') || hit.includes('end my life'));

  if (hasCriticalKeyword || analysis.score >= 4) {
    return {
      detected: true,
      level: 'high',
      showEmergencyAlert: true,
      recommendProfessionalHelp: true,
      keywordHits: analysis.keywordHits,
      score: analysis.score,
    };
  }

  if (analysis.score >= 2) {
    return {
      detected: true,
      level: 'medium',
      showEmergencyAlert: false,
      recommendProfessionalHelp: true,
      keywordHits: analysis.keywordHits,
      score: analysis.score,
    };
  }

  return {
    detected: false,
    level: 'none',
    showEmergencyAlert: false,
    recommendProfessionalHelp: false,
    keywordHits: [],
    score: analysis.score,
  };
};

const getCrisisImmediateResponse = (language = 'en') => {
  const code = getLanguageCode(language);
  if (code === 'ta') {
    return 'நீங்கள் இப்போது மிகவும் கஷ்டமாக உணர்கிறீர்கள் என்று கேட்கிறேன். நீங்கள் தனியாக இல்லை. தயவுசெய்து உடனே நம்பகமான ஒருவரை அல்லது உள்ளூர் அவசர உதவி எண்ணை தொடர்பு கொள்ளுங்கள். நீங்கள் பாதுகாப்பாக இருக்க வேண்டும்.';
  }
  if (code === 'hi') {
    return 'मैं सुन रहा/रही हूँ कि आप अभी बहुत कठिन समय से गुजर रहे हैं। आप अकेले नहीं हैं। कृपया तुरंत किसी भरोसेमंद व्यक्ति या स्थानीय इमरजेंसी हेल्पलाइन से संपर्क करें। आपकी सुरक्षा सबसे महत्वपूर्ण है।';
  }
  if (code === 'ml') {
    return 'നിങ്ങൾ ഇപ്പോൾ വളരെ ബുദ്ധിമുട്ടുള്ള അവസ്ഥയിലൂടെ പോകുന്നതായി തോന്നുന്നു. നിങ്ങൾ ഒറ്റക്കല്ല. ദയവായി ഉടൻ വിശ്വസ്തനായ ഒരാളെയോ പ്രാദേശിക അടിയന്തര സഹായ നമ്പറെയോ ബന്ധപ്പെടുക. നിങ്ങളുടെ സുരക്ഷയാണ് പ്രാധാന്യം.';
  }
  return 'I hear that you are in deep pain right now. You are not alone. Please contact a trusted person or your local emergency/crisis line immediately. Your safety matters most right now.';
};

const safeDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hoursSince = (value) => {
  const date = safeDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
};

let firestoreDb = null;

const initializeFirebaseAdmin = () => {
  if (firestoreDb) {
    return firestoreDb;
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!serviceAccountRaw) {
    console.warn('[Agentic] FIREBASE_SERVICE_ACCOUNT is not configured. Agent scheduler will run in degraded mode.');
    return null;
  }

  try {
    const credentials = JSON.parse(serviceAccountRaw);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    }
    firestoreDb = admin.firestore();
    return firestoreDb;
  } catch (error) {
    console.error('[Agentic] Failed to initialize Firebase Admin:', error?.message || error);
    return null;
  }
};

const readRecentMoods = async (db, userId, maxItems = 7) => {
  const snap = await db
    .collection('moods')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(maxItems)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const readRecentChats = async (db, userId, maxItems = 8) => {
  const snap = await db
    .collection('chats')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(maxItems)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const filterToLast24Hours = (items = [], timestampFields = ['timestamp', 'createdAt']) => {
  const { start } = getTimeWindow24Hours();
  const startMs = start.getTime();

  return items.filter((item) => {
    const dateValue = timestampFields
      .map((field) => safeDate(item?.[field]))
      .find((date) => date instanceof Date);

    if (!dateValue) {
      return false;
    }

    return dateValue.getTime() >= startMs;
  });
};

const detectMoodDrop = (moods = []) => {
  if (!Array.isArray(moods) || moods.length < 4) {
    return { detected: false, delta: 0 };
  }

  const scores = moods
    .map((item) => MOOD_SCORE_MAP[(item?.mood || '').toLowerCase()] || 2.5)
    .filter((score) => typeof score === 'number');

  if (scores.length < 4) {
    return { detected: false, delta: 0 };
  }

  const split = Math.floor(scores.length / 2);
  const latestAverage = scores.slice(0, split).reduce((a, b) => a + b, 0) / split;
  const olderAverage = scores.slice(split).reduce((a, b) => a + b, 0) / (scores.length - split);
  const delta = Number((latestAverage - olderAverage).toFixed(2));

  return {
    detected: delta <= -0.6,
    delta,
  };
};

const escapePdfText = (value) => String(value || '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapPdfText = (text, width = 88) => {
  const lines = [];
  const paragraphs = String(text || '').split(/\r?\n/);

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }

    let current = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const word = words[index];
      if ((current.length + 1 + word.length) <= width) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }

    lines.push(current);
  });

  return lines.length ? lines : [''];
};

const buildPdfBuffer = (lines = []) => {
  const safeLines = lines.map((line) => escapePdfText(line));
  const contentParts = [
    'BT',
    '/F1 12 Tf',
    '72 760 Td',
    '14 TL',
  ];

  safeLines.forEach((line, index) => {
    contentParts.push(index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`);
  });

  contentParts.push('ET');
  const contentStream = Buffer.from(contentParts.join('\n'), 'latin1');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj << /Length ${contentStream.length} >>\nstream\n`,
  ];

  let pdfBuffer = Buffer.from('%PDF-1.4\n', 'latin1');
  const offsets = [];

  objects.forEach((objectString) => {
    offsets.push(pdfBuffer.length);
    pdfBuffer = Buffer.concat([pdfBuffer, Buffer.from(objectString, 'latin1')]);
  });

  offsets.push(pdfBuffer.length);
  pdfBuffer = Buffer.concat([pdfBuffer, contentStream, Buffer.from('\nendstream\nendobj\n', 'latin1')]);

  const xrefStart = pdfBuffer.length;
  const xrefLines = ['xref', '0 6', '0000000000 65535 f '];
  offsets.forEach((offset) => {
    xrefLines.push(`${String(offset).padStart(10, '0')} 00000 n `);
  });

  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.concat([
    pdfBuffer,
    Buffer.from(`${xrefLines.join('\n')}\n`, 'latin1'),
    Buffer.from(trailer, 'latin1'),
  ]);
};

const buildDailyReportPayload = async (db, userId, language = 'en', includePersistence = true) => {
  const languageName = getLanguageName(language);
  const [chatsRaw, moodsRaw] = db
    ? await Promise.all([
      readRecentChats(db, userId, 60),
      readRecentMoods(db, userId, 60),
    ])
    : [[], []];

  const chats = filterToLast24Hours(chatsRaw, ['timestamp', 'createdAt'])
    .slice(0, 30)
    .map((item) => ({
      message: String(item.message || '').slice(0, 140),
      detectedMood: item.detectedMood || 'neutral',
      createdAt: toISO(safeDate(item.timestamp) || safeDate(item.createdAt)),
    }));

  const moods = filterToLast24Hours(moodsRaw, ['timestamp', 'createdAt'])
    .slice(0, 40)
    .map((item) => ({
      mood: (item.mood || 'neutral').toLowerCase(),
      source: item.source || 'ai',
      createdAt: toISO(safeDate(item.timestamp) || safeDate(item.createdAt)),
    }));

  const reportPrompt = buildDailySummaryPrompt({
    languageName,
    chats,
    moods,
  });

  const reportSummaryCompletion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an intelligent mental health assistant. Keep reports concise, supportive, and professional.',
      },
      {
        role: 'user',
        content: reportPrompt,
      },
    ],
    temperature: 0.35,
    max_tokens: 220,
    top_p: 1,
  });

  const aiSummary = String(reportSummaryCompletion?.choices?.[0]?.message?.content || '').trim();

  let moodRecovery = null;
  if (db) {
    let latestRecoverySnap;
    try {
      latestRecoverySnap = await db
        .collection('moodRecoveryScores')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
    } catch (_indexError) {
      latestRecoverySnap = await db
        .collection('moodRecoveryScores')
        .where('userId', '==', userId)
        .limit(20)
        .get();
    }

    if (!latestRecoverySnap.empty) {
      const sortedDocs = [...latestRecoverySnap.docs].sort((a, b) => {
        const aData = a.data() || {};
        const bData = b.data() || {};
        const aTime = (safeDate(aData.timestamp) || safeDate(aData.createdAt) || new Date(0)).getTime();
        const bTime = (safeDate(bData.timestamp) || safeDate(bData.createdAt) || new Date(0)).getTime();
        return bTime - aTime;
      });

      const recoveryData = sortedDocs[0]?.data?.() || {};
      moodRecovery = calculateMoodRecovery(recoveryData.initialMood, recoveryData.finalMood);
      moodRecovery = {
        ...moodRecovery,
        timestamp: toISO(safeDate(recoveryData.timestamp) || safeDate(recoveryData.createdAt)),
      };
    }
  }

  const reportDate = new Date().toISOString().slice(0, 10);
  const payload = {
    userId,
    date: reportDate,
    summary: aiSummary,
    aiInsights: [aiSummary],
    insights: {
      chatCountLast24Hours: chats.length,
      moodCountLast24Hours: moods.length,
      moods,
    },
    moodRecovery,
    pdfUrl: null,
  };

  if (includePersistence && db) {
    await db.collection('dailyReports').add({
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  return payload;
};

const buildDailyReportPdfBuffer = (payload) => {
  const reportDate = String(payload?.date || new Date().toISOString()).slice(0, 10);
  const moodRecoveryLine = payload?.moodRecovery
    ? `${payload.moodRecovery.initialMood} -> ${payload.moodRecovery.finalMood} (Score: ${payload.moodRecovery.recoveryScore > 0 ? `+${payload.moodRecovery.recoveryScore}` : payload.moodRecovery.recoveryScore})`
    : 'No mood recovery data available for today.';

  const lines = [
    'Daily Mental Health Report',
    `Date: ${reportDate}`,
    `User: ${payload?.userId || 'unknown'}`,
    '',
    'Mood Summary:',
    ...wrapPdfText(payload?.summary || 'No summary available.'),
    '',
    'AI-Generated Insights:',
    `Chats in last 24h: ${Number(payload?.insights?.chatCountLast24Hours || 0)}`,
    `Mood check-ins in last 24h: ${Number(payload?.insights?.moodCountLast24Hours || 0)}`,
    '',
    'Mood Recovery Score:',
    ...wrapPdfText(moodRecoveryLine),
    '',
    'Generated by MindCare AI assistant',
  ];

  return buildPdfBuffer(lines);
};

const sendPushToUser = async ({ pushToken, title, body, data = {} }) => {
  if (!pushToken || typeof pushToken !== 'string') {
    return { success: false, reason: 'missing-token' };
  }

  try {
    await axios.post(EXPO_PUSH_URL, {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });
    return { success: true };
  } catch (error) {
    console.warn('[Agentic] Push send failed:', error?.message || error);
    return { success: false, reason: 'send-failed' };
  }
};

const buildReflectionPrompt = ({ languageName, moods, chats }) => {
  return `You are an intelligent mental health assistant.
Analyze user data and generate:
- insights
- suggestions
- warnings (if needed)

Rules:
- Keep it supportive and non-judgmental.
- Keep summary under 45 words.
- Mention one clear mood trend from today.
- Respond strictly in ${languageName}.

Mood entries: ${JSON.stringify(moods)}
Chat entries: ${JSON.stringify(chats)}`;
};

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

    const crisis = analyzeCrisisSignal(message.trim());

    if (crisis.detected && crisis.level === 'high') {
      const immediateResponse = getCrisisImmediateResponse(language);
      const urgentSuggestions = await generateSuggestionsFromMessage(message.trim(), 'sad', language);

      return res.json({
        response: immediateResponse,
        mood: 'sad',
        suggestions: urgentSuggestions,
        userId,
        timestamp: new Date().toISOString(),
        crisis,
      });
    }

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
      crisis,
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

const evaluateAgentDecisions = async ({ userId, language = 'en' } = {}) => {
  const db = initializeFirebaseAdmin();
  if (!db || !userId) {
    return {
      userId,
      actions: [],
      reason: 'firebase-admin-not-configured-or-user-missing',
    };
  }

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return {
      userId,
      actions: [],
      reason: 'user-not-found',
    };
  }

  const user = userSnap.data() || {};
  const userLanguage = user.preferredLanguage || language;
  const languageName = getLanguageName(userLanguage);
  const userMoods = await readRecentMoods(db, userId, 8);
  const moodDrop = detectMoodDrop(userMoods);
  const inactivityHours = hoursSince(user.lastActive || user.lastChatAt);
  const actions = [];

  if (inactivityHours >= INACTIVITY_CHECK_HOURS) {
    const body = languageName === 'Tamil'
      ? 'நாங்கள் உங்களைப் பற்றி கவலைப்படுகிறோம். செக்-இன் செய்ய வேண்டுமா?'
      : languageName === 'Hindi'
        ? 'हमने आपकी खबर नहीं सुनी। क्या आप चेक-इन करना चाहेंगे?'
        : languageName === 'Malayalam'
          ? 'നിങ്ങളിൽ നിന്ന് കേട്ടിട്ട് നേരമായി. ചെക്ക്-ഇൻ ചെയ്യാമോ?'
          : 'We haven’t heard from you. Want to check in?';

    const pushResult = await sendPushToUser({
      pushToken: user.pushToken || '',
      title: 'MindCare',
      body,
      data: { type: 'inactivity_checkin', userId },
    });

    actions.push({
      type: 'inactivity_reminder',
      triggered: true,
      inactivityHours: Number(inactivityHours.toFixed(2)),
      pushSent: pushResult.success,
    });
  }

  if (moodDrop.detected) {
    const body = languageName === 'Tamil'
      ? 'சமீபத்தில் உங்கள் மனநிலை குறைந்துள்ளது போல தெரிகிறது. இப்போது 2 நிமிடம் சுவாச பயிற்சி செய்வோமா?'
      : languageName === 'Hindi'
        ? 'हाल में आपका मूड थोड़ा गिरा दिख रहा है। क्या अभी 2 मिनट की श्वास अभ्यास करें?'
        : languageName === 'Malayalam'
          ? 'സമീപകാലത്ത് മൂഡ് കുറവായി തോന്നുന്നു. ഇപ്പോൾ 2 മിനിറ്റ് ശ്വസന അഭ്യാസം ചെയ്യാമോ?'
          : 'Your recent mood trend looks lower. Want to try a 2-minute breathing reset?';

    const pushResult = await sendPushToUser({
      pushToken: user.pushToken || '',
      title: 'MindCare Support',
      body,
      data: { type: 'mood_drop_intervention', userId, delta: moodDrop.delta },
    });

    actions.push({
      type: 'mood_drop_intervention',
      triggered: true,
      delta: moodDrop.delta,
      pushSent: pushResult.success,
    });
  }

  if (actions.length) {
    await db.collection('agent_events').add({
      userId,
      actions,
      createdAt: new Date().toISOString(),
      source: 'decision-layer',
    });
  }

  return {
    userId,
    actions,
    inactivityHours: Number(inactivityHours.toFixed(2)),
    moodDrop,
  };
};

const generateAndStoreDailyReflection = async ({ userId, language = 'en' } = {}) => {
  const db = initializeFirebaseAdmin();
  if (!db || !userId) {
    return null;
  }

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return null;
  }

  const user = userSnap.data() || {};
  const resolvedLanguage = user.preferredLanguage || language;
  const languageName = getLanguageName(resolvedLanguage);
  const moods = await readRecentMoods(db, userId, 8);
  const chats = await readRecentChats(db, userId, 10);

  const compactMoods = moods.slice(0, 6).map((item) => ({
    mood: item.mood || 'neutral',
    timestamp: safeDate(item.timestamp || item.createdAt)?.toISOString() || null,
  }));

  const compactChats = chats.slice(0, 6).map((item) => ({
    message: String(item.message || '').slice(0, 120),
    detectedMood: item.detectedMood || 'neutral',
    timestamp: safeDate(item.timestamp || item.createdAt)?.toISOString() || null,
  }));

  if (!compactMoods.length && !compactChats.length) {
    return null;
  }

  const reflectionCompletion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a supportive mental health assistant focused on concise daily reflections.',
      },
      {
        role: 'user',
        content: buildReflectionPrompt({
          languageName,
          moods: compactMoods,
          chats: compactChats,
        }),
      },
    ],
    temperature: 0.35,
    max_tokens: 140,
    top_p: 1,
  });

  const summary = String(reflectionCompletion?.choices?.[0]?.message?.content || '').trim();
  if (!summary) {
    return null;
  }

  const docRef = await db.collection('reflections').add({
    userId,
    summary,
    timestamp: new Date().toISOString(),
    source: 'daily-reflection-agent',
    signals: {
      moodCount: compactMoods.length,
      chatCount: compactChats.length,
    },
  });

  return {
    id: docRef.id,
    userId,
    summary,
  };
};

app.post('/agents/evaluate', async (req, res) => {
  try {
    const { userId, language = 'en' } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const result = await evaluateAgentDecisions({ userId, language });
    return res.json(result);
  } catch (error) {
    console.error('[Agent Evaluate Error]', error);
    return res.status(500).json({ error: 'Failed to evaluate agent decisions.' });
  }
});

app.post('/agents/reflections/run', async (req, res) => {
  try {
    const { userId, language = 'en' } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const reflection = await generateAndStoreDailyReflection({ userId, language });
    return res.json({ success: true, reflection });
  } catch (error) {
    console.error('[Reflection Agent Error]', error);
    return res.status(500).json({ error: 'Failed to generate daily reflection.' });
  }
});

app.get('/reflections/:userId', async (req, res) => {
  try {
    const db = initializeFirebaseAdmin();
    if (!db) {
      return res.status(503).json({ error: 'Firebase Admin is not configured.' });
    }

    const userId = req.params.userId;
    const limitValue = Number.parseInt(String(req.query.limit || '7'), 10);
    const maxItems = Number.isFinite(limitValue) ? Math.max(1, Math.min(30, limitValue)) : 7;

    const snap = await db
      .collection('reflections')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(maxItems)
      .get();

    const reflections = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json({ reflections });
  } catch (error) {
    console.error('[Reflections Fetch Error]', error);
    return res.status(500).json({ error: 'Failed to fetch reflections.' });
  }
});

app.post('/reports/daily', async (req, res) => {
  try {
    const db = initializeFirebaseAdmin();

    const { userId, language = 'en', includePersistence = true } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }
    const payload = await buildDailyReportPayload(db, userId, language, includePersistence);
    return res.json(payload);
  } catch (error) {
    console.error('[Daily Report Error]', error);
    return res.status(500).json({ error: 'Failed to generate daily report.' });
  }
});

app.get('/reports/daily/pdf', async (req, res) => {
  try {
    const db = initializeFirebaseAdmin();

    const { userId, language = 'en' } = req.query || {};
    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const payload = await buildDailyReportPayload(db, userId, language, false);
    const pdfBuffer = buildDailyReportPdfBuffer(payload);
    const fileName = `mental_report_${payload.date || new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Daily Report PDF Error]', error);
    return res.status(500).json({ error: 'Failed to generate daily report PDF.' });
  }
});

const runInactivitySweep = async () => {
  const db = initializeFirebaseAdmin();
  if (!db) {
    return;
  }

  const snap = await db.collection('users').limit(200).get();
  for (const userDoc of snap.docs) {
    const user = userDoc.data() || {};
    if (user.notificationsEnabled === false) {
      continue;
    }
    await evaluateAgentDecisions({
      userId: userDoc.id,
      language: user.preferredLanguage || 'en',
    });
  }
};

const runDailyReflectionSweep = async () => {
  const db = initializeFirebaseAdmin();
  if (!db) {
    return;
  }

  const snap = await db.collection('users').limit(200).get();
  for (const userDoc of snap.docs) {
    const user = userDoc.data() || {};
    const lastActiveHours = hoursSince(user.lastActive || user.lastChatAt);
    if (lastActiveHours > 24 * 10) {
      continue;
    }
    await generateAndStoreDailyReflection({
      userId: userDoc.id,
      language: user.preferredLanguage || 'en',
    });
  }
};

const initializeAgentScheduler = () => {
  initializeFirebaseAdmin();

  cron.schedule('0 * * * *', async () => {
    try {
      await runInactivitySweep();
    } catch (error) {
      console.error('[Scheduler] Inactivity sweep failed:', error?.message || error);
    }
  }, { timezone: AGENT_TIMEZONE });

  cron.schedule(`0 ${Math.max(0, Math.min(23, REFLECTION_HOUR))} * * *`, async () => {
    try {
      await runDailyReflectionSweep();
    } catch (error) {
      console.error('[Scheduler] Reflection sweep failed:', error?.message || error);
    }
  }, { timezone: AGENT_TIMEZONE });
};

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

initializeAgentScheduler();
startServer(PORT);

module.exports = app;
