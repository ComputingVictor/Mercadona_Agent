#!/bin/bash

# Chat Setup Script
# =====================================
# Quick setup script for Recipe Assistant Chat

echo "🤖 Recipe Assistant Chat - Setup"
echo "=================================="
echo ""

# Check if config.js exists
if [ -f "config.js" ]; then
    echo "✅ config.js already exists"

    # Check if API key is configured
    if grep -q "YOUR_OPENROUTER_API_KEY_HERE" config.js; then
        echo "⚠️  WARNING: API key not configured yet"
        echo ""
        echo "Please edit config.js and add your OpenRouter API key:"
        echo "  1. Get your API key from: https://openrouter.ai/keys"
        echo "  2. Open config.js in your editor"
        echo "  3. Replace 'YOUR_OPENROUTER_API_KEY_HERE' with your actual key"
        echo ""
    else
        echo "✅ API key appears to be configured"
        echo ""
    fi
else
    echo "📝 Creating config.js from example..."
    if [ -f "config.example.js" ]; then
        cp config.example.js config.js
        echo "✅ config.js created!"
        echo ""
        echo "⚠️  IMPORTANT: Edit config.js and add your OpenRouter API key:"
        echo "  1. Get your API key from: https://openrouter.ai/keys"
        echo "  2. Open config.js in your editor"
        echo "  3. Replace 'YOUR_OPENROUTER_API_KEY_HERE' with your actual key"
        echo ""
    else
        echo "❌ ERROR: config.example.js not found"
        exit 1
    fi
fi

# Check if required files exist
echo "Checking required files..."

FILES=("chat.js" "chat.css" "index.html" "script.js")
ALL_EXIST=true

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ALL_EXIST=false
    fi
done

echo ""

if [ "$ALL_EXIST" = true ]; then
    echo "✅ All required files are present!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure your API key in config.js"
    echo "  2. Open index.html in your browser"
    echo "  3. Click the chat button in the bottom right"
    echo "  4. Start chatting! 🎉"
    echo ""
    echo "Need help? Check CHAT_SETUP.md for detailed instructions"
else
    echo "❌ Some files are missing. Please ensure all files are present."
    exit 1
fi

# Check if we can start a server
echo ""
echo "Do you want to start a local server? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Starting local server..."

    # Check for python
    if command -v python3 &> /dev/null; then
        echo "✅ Using Python 3"
        echo "🌐 Server starting at http://localhost:8000"
        echo "Press Ctrl+C to stop"
        echo ""
        python3 -m http.server 8000
    elif command -v python &> /dev/null; then
        echo "✅ Using Python 2"
        echo "🌐 Server starting at http://localhost:8000"
        echo "Press Ctrl+C to stop"
        echo ""
        python -m SimpleHTTPServer 8000
    else
        echo "❌ Python not found. Please install Python or use another web server."
        echo ""
        echo "Alternative: npx serve ."
    fi
fi
