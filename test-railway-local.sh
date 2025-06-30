#!/bin/bash

echo "🧪 Testing Railway build locally..."

# Set environment variables
export NODE_ENV=production
export PORT=3333

# Build the app
echo "📦 Building..."
npm run build:railway

# Start the server
echo "🚀 Starting server on port $PORT..."
cd dist && node railway-server.js