from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
import math

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


def escape_pdf_text(value):
    """Escape text for a simple single-page PDF content stream."""
    safe_text = str(value or '').encode('latin-1', errors='replace').decode('latin-1')
    return safe_text \
        .replace('\\', '\\\\') \
        .replace('(', '\\(') \
        .replace(')', '\\)')


def wrap_pdf_text(text, width=88):
    """Wrap text into simple PDF-friendly lines."""
    lines = []
    for paragraph in str(text or '').splitlines() or ['']:
        words = paragraph.split()
        if not words:
            lines.append('')
            continue

        current = words[0]
        for word in words[1:]:
            if len(current) + 1 + len(word) <= width:
                current += f' {word}'
            else:
                lines.append(current)
                current = word
        lines.append(current)

    return lines or ['']


def build_pdf_bytes(lines):
    """Build a minimal one-page PDF with Helvetica text only."""
    safe_lines = [escape_pdf_text(line) for line in lines]
    content_parts = [
        'BT',
        '/F1 12 Tf',
        '72 760 Td',
        '14 TL',
    ]

    for index, line in enumerate(safe_lines):
        if index == 0:
            content_parts.append(f'({line}) Tj')
        else:
            content_parts.append(f'T* ({line}) Tj')

    content_parts.append('ET')
    content_stream = '\n'.join(content_parts).encode('latin-1')

    objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
        '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
        f'5 0 obj << /Length {len(content_stream)} >>\nstream\n',
    ]

    pdf_bytes = b'%PDF-1.4\n'
    offsets = []

    for obj in objects:
        offsets.append(len(pdf_bytes))
        pdf_bytes += obj.encode('latin-1')

    offsets.append(len(pdf_bytes))
    pdf_bytes += content_stream + b'\nendstream\nendobj\n'

    xref_start = len(pdf_bytes)
    xref_lines = ['xref', '0 6', '0000000000 65535 f ']
    for offset in offsets:
        xref_lines.append(f'{offset:010d} 00000 n ')

    trailer = f'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n'
    pdf_bytes += ('\n'.join(xref_lines) + '\n').encode('latin-1') + trailer.encode('latin-1')

    return pdf_bytes


def build_daily_report_payload(user_id, language='en'):
    """Create the report payload shared by JSON and PDF endpoints."""
    language_name = resolve_language_name(language)
    prompt = f"""
You are a supportive mental health assistant.
Write a brief daily emotional summary in {language_name}.

Required output:
1) Overall emotional trend (1 short sentence)
2) One compassionate insight (1 short sentence)
3) One gentle suggestion for tomorrow (1 short sentence)
"""

    try:
        response = openai.ChatCompletion.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            temperature=0.4,
            max_tokens=180,
            top_p=0.95
        )
        ai_summary = response['choices'][0]['message']['content']
    except Exception as llm_error:
        logger.warning(f'Daily report summary generation failed: {str(llm_error)}')
        normalized_language = str(language or '').strip().lower()
        if normalized_language == 'ta':
            ai_summary = 'இன்றைய உணர்ச்சி நிலை மிதமான மற்றும் சமநிலையுடன் இருந்தது. நாளைக்கு சிறிய சுய பராமரிப்பு நேரத்தை ஒதுக்க முயற்சிக்கவும்.'
        elif normalized_language == 'hi':
            ai_summary = 'आज आपकी भावनात्मक स्थिति मध्यम और संतुलित रही। कल के लिए थोड़ा समय खुद की देखभाल में दें।'
        elif normalized_language == 'ml':
            ai_summary = 'ഇന്ന് നിങ്ങളുടെ മാനസിക പ്രവണതി മിതമായും സമതുലിതമായും ഉണ്ടായിരുന്നു. നാളെയായി സ്വയംപരിചരണത്തിന് ചെറിയ സമയം മാറ്റിവയ്ക്കുക.'
        else:
            ai_summary = 'Your emotional trend today appears generally steady. Consider setting aside a few minutes for gentle self-care tomorrow.'

    now_iso = datetime.now().isoformat()
    return {
        'userId': user_id,
        'date': now_iso,
        'summary': ai_summary,
        'aiInsights': [ai_summary],
        'insights': {
            'chatCountLast24Hours': 0,
            'moodCountLast24Hours': 0,
            'moods': []
        },
        'moodRecovery': None,
        'pdfUrl': None,
        'source': 'flask-fallback'
    }

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


@app.route('/reports/daily', methods=['POST'])
def daily_report():
    """Compatibility endpoint for daily report generation when Flask backend is active."""
    try:
        data = request.get_json() or {}
        user_id = data.get('userId')
        language = data.get('language', 'en')

        if not user_id:
            return jsonify({
                'error': 'Missing required field: userId'
            }), 400
        payload = build_daily_report_payload(user_id, language)
        return jsonify(payload), 200

    except Exception as e:
        logger.error(f'Daily report generation failed: {str(e)}')
        return jsonify({
            'error': 'Failed to generate daily report'
        }), 500


@app.route('/reports/daily/pdf', methods=['GET'])
def daily_report_pdf():
    """Generate and return a PDF for the daily report."""
    try:
        user_id = request.args.get('userId')
        language = request.args.get('language', 'en')

        if not user_id:
            return jsonify({
                'error': 'Missing required field: userId'
            }), 400

        report = build_daily_report_payload(user_id, language)
        report_date = str(report.get('date') or datetime.now().isoformat())[:10]

        pdf_lines = [
            'Daily Mental Health Report',
            f'Date: {report_date}',
            f'User: {user_id}',
            '',
            'Mood Summary:',
        ]

        pdf_lines.extend(wrap_pdf_text(report.get('summary') or 'No summary available.'))
        pdf_lines.extend([
            '',
            'AI-Generated Insights:',
            f"Chats in last 24h: {report.get('insights', {}).get('chatCountLast24Hours', 0)}",
            f"Mood check-ins in last 24h: {report.get('insights', {}).get('moodCountLast24Hours', 0)}",
            '',
            'Mood Recovery Score:',
            'No mood recovery data available for today.',
            '',
            'Generated by MindCare AI assistant',
        ])

        pdf_bytes = build_pdf_bytes(pdf_lines)
        file_name = f'mental_report_{report_date}.pdf'

        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename={file_name}'
            }
        )

    except Exception as e:
        logger.error(f'Daily report PDF generation failed: {str(e)}')
        return jsonify({
            'error': 'Failed to generate daily report PDF'
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
