from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# OpenAI Configuration
openai.api_key = os.getenv('OPENAI_API_KEY')

LANGUAGE_NAMES = {
    'en': 'English',
    'ta': 'Tamil',
    'hi': 'Hindi',
    'ml': 'Malayalam',
}


def resolve_language_name(language_value):
    """Map language code/value to a readable language name."""
    normalized = str(language_value or '').strip().lower()
    if not normalized:
        return 'English'
    return LANGUAGE_NAMES.get(normalized, str(language_value).strip())

# System prompt for mental health assistant
SYSTEM_PROMPT = """You are a supportive and empathetic mental health assistant. Your role is to provide compassionate, non-judgmental support using CBT (Cognitive Behavioral Therapy) principles and techniques.

IMPORTANT GUIDELINES:
1. Be empathetic and validate the person's feelings
2. Use active listening techniques
3. Ask thoughtful follow-up questions
4. Provide coping strategies and techniques when appropriate
5. Use CBT approaches like identifying thoughts, feelings, and behaviors
6. Do NOT provide medical diagnosis or prescribe medication
7. Do NOT replace professional mental health treatment
8. If the person expresses severe distress or suicidal thoughts, recommend immediate professional help

TONE: Warm, understanding, and professional."""


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'Mental health chat backend is running'
    })


@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        # Extract request data
        data = request.get_json() or {}
        user_id = data.get('userId')
        language = data.get('language', 'en')
        message = data.get('message')

        # Keep explicit field access pattern requested by product requirements
        request_json = request.json or {}
        language = request_json.get('language', language)
        message = request_json.get('message', message)
        language_name = resolve_language_name(language)

        # Validate input
        if not user_id or not message:
            return jsonify({
                'error': 'Missing required fields: userId and message'
            }), 400

        if not isinstance(message, str) or len(message.strip()) == 0:
            return jsonify({
                'error': 'Message must be a non-empty string'
            }), 400

        logger.info(f"Chat request from user: {user_id}")

        prompt = f"""
You are a supportive mental health assistant.
Respond ONLY in {language_name}.
Be empathetic and simple.

User: {message.strip()}
"""

        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            temperature=0.7,
            max_tokens=500,
            top_p=0.95
        )

        # Extract AI response
        ai_response = response['choices'][0]['message']['content']

        if not ai_response:
            logger.error('Empty response from OpenAI API')
            return jsonify({
                'error': 'Failed to generate response from AI'
            }), 500

        logger.info(f"Response generated for user: {user_id}")

        # Return response
        return jsonify({
            'response': ai_response,
            'userId': user_id,
            'timestamp': datetime.now().isoformat()
        })

    except openai.error.RateLimitError:
        logger.error('OpenAI API rate limited')
        return jsonify({
            'error': 'OpenAI API rate limited. Please try again later.'
        }), 429

    except openai.error.AuthenticationError:
        logger.error('OpenAI authentication error')
        return jsonify({
            'error': 'Authentication error with AI service. Please contact support.'
        }), 500

    except openai.error.InvalidRequestError as e:
        logger.error(f'Invalid request to OpenAI: {str(e)}')
        if 'insufficient_quota' in str(e):
            return jsonify({
                'error': 'AI service quota exceeded. Please try again later.'
            }), 500
        return jsonify({
            'error': 'Invalid request to AI service'
        }), 400

    except Exception as e:
        logger.error(f'Unexpected error: {str(e)}')
        return jsonify({
            'error': 'Failed to process your message. Please try again later.'
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f'Internal server error: {str(error)}')
    return jsonify({
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    api_key_configured = bool(os.getenv('OPENAI_API_KEY'))
    
    logger.info(f'🚀 Mental health chat backend running on http://localhost:{port}')
    logger.info(f'✓ API Key configured: {"Yes" if api_key_configured else "No"}')
    logger.info(f'✓ Health check: GET http://localhost:{port}/health')
    logger.info(f'✓ Chat endpoint: POST http://localhost:{port}/chat')
    
    # Run Flask app
    app.run(host='0.0.0.0', port=port, debug=False)
