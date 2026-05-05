#!/bin/bash
# Build script for Render deployment
# This runs after dependencies are installed but before the app starts

echo "🚀 Render Build Script for Flask RAG"

# Change to RAG directory
cd backend/rag

# Create necessary directories
mkdir -p data_folder
mkdir -p faiss_index

echo "📂 Directories ready"

# If this is first deployment, ingest knowledge base
if [ ! -f "processed_files.json" ]; then
    echo "📚 First deployment detected - would ingest knowledge base here"
    echo "   Knowledge base will be loaded from local files on startup"
else
    echo "✅ Knowledge base already indexed"
fi

echo "✨ Build complete!"
