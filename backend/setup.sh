#!/bin/bash

# Mental Health Chat Backend - Quick Setup Script
# Supports: Node.js/Express

echo "🚀 Mental Health Chat Backend Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file already exists"
else
    echo "📝 Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ .env created. Please edit it with your OpenAI API key:"
        echo "   OPENAI_API_KEY=sk-your-key-here"
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed"
        exit 1
    fi
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your OpenAI API key"
echo "2. Run: npm start"
echo "3. Backend will start on http://localhost:5000"
echo ""
echo "Test the endpoint:"
echo "  curl -X POST http://localhost:5000/chat \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"userId\":\"test\",\"message\":\"Hello\"}'"
echo ""
