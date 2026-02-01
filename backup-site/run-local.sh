#!/bin/bash

echo "================================"
echo "ClearView Intelligence Dashboard"
echo "Local Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please download it from https://nodejs.org"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install --silent

if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed"
    exit 1
fi

echo ""
echo "Starting dashboard..."
echo "Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

npm run dev
