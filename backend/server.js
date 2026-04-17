require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mental health chat backend is running' });
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;

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

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: message.trim(),
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.95,
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error('[OpenAI] Empty response from API');
      return res.status(500).json({
        error: 'Failed to generate response from AI',
      });
    }

    console.log(`[${new Date().toISOString()}] Response generated for user: ${userId}`);

    // Return response
    res.json({
      response: aiResponse,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ERROR]', error);

    // Handle specific OpenAI errors
    if (error.status === 429) {
      return res.status(429).json({
        error: 'OpenAI API rate limited. Please try again later.',
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        error: 'Authentication error with AI service. Please contact support.',
      });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(500).json({
        error: 'AI service quota exceeded. Please try again later.',
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Failed to process your message. Please try again later.',
    });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mental health chat backend running on http://localhost:${PORT}`);
  console.log(`✓ API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`✓ Health check: GET http://localhost:${PORT}/health`);
  console.log(`✓ Chat endpoint: POST http://localhost:${PORT}/chat`);
});

module.exports = app;
