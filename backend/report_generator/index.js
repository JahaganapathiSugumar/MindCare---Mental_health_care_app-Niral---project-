const MOOD_SCALE = {
  sad: 1,
  anxious: 2,
  neutral: 3,
  happy: 4,
};

const normalizeMood = (value) => {
  const mood = String(value || '').trim().toLowerCase();
  return MOOD_SCALE[mood] ? mood : 'neutral';
};

const getRecoveryMessage = (score) => {
  if (score > 0) {
    return 'Your mood improved during this conversation 😊';
  }

  if (score < 0) {
    return 'Let us continue working through this together';
  }

  return 'You are maintaining your emotional state';
};

const calculateMoodRecovery = (initialMood, finalMood) => {
  const fromMood = normalizeMood(initialMood);
  const toMood = normalizeMood(finalMood);
  const recoveryScore = (MOOD_SCALE[toMood] || 3) - (MOOD_SCALE[fromMood] || 3);

  return {
    initialMood: fromMood,
    finalMood: toMood,
    recoveryScore,
    message: getRecoveryMessage(recoveryScore),
  };
};

const getTimeWindow24Hours = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    start,
    end,
  };
};

const toISO = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildDailySummaryPrompt = ({ languageName, chats = [], moods = [] } = {}) => {
  return `Analyze the user's emotional activity today and generate a short summary including:
- overall mood trend
- key emotional moments
- positive or negative changes
- gentle suggestion for tomorrow

Rules:
- Keep tone supportive and non-judgmental.
- Keep summary concise (max 80 words).
- Respond strictly in ${languageName}.

Recent chats: ${JSON.stringify(chats)}
Recent moods: ${JSON.stringify(moods)}`;
};

module.exports = {
  MOOD_SCALE,
  normalizeMood,
  calculateMoodRecovery,
  getTimeWindow24Hours,
  toISO,
  buildDailySummaryPrompt,
};
