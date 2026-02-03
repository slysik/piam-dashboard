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

# Check if CDC pipeline is running
CDC_RUNNING=false
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "piam-clickhouse"; then
    CDC_RUNNING=true
    echo "✓ CDC Pipeline detected (ClickHouse running)"

    # Check other services
    if docker ps --format '{{.Names}}' | grep -q "piam-generator"; then
        echo "✓ Generator running"
    fi
    if docker ps --format '{{.Names}}' | grep -q "piam-consumer"; then
        echo "✓ Consumer running"
    fi
    echo ""
    echo "Live Data mode will work! Toggle it ON in Settings."
else
    echo "ℹ CDC Pipeline not running"
    echo "  Dashboard will work in Demo Data mode (hardcoded data)"
    echo ""
    echo "  To enable Live Data mode, run from project root:"
    echo "    make demo-up"
fi
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
if [ "$CDC_RUNNING" = true ]; then
    echo "Mode: Live Data available (toggle in Settings)"
else
    echo "Mode: Demo Data (hardcoded)"
fi
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

npm run dev
