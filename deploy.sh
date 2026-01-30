#!/bin/bash
set -e

# --- Configuration ---
# Replace with your actual Google Cloud Project ID
PROJECT_ID="YOUR_PROJECT_ID_HERE"
APP_NAME="telescope-app"
REGION="us-central1"

echo "=================================================="
echo "   TELESCOPE DEPLOYMENT SCRIPT"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create a .env file with your API keys (API_KEY, etc.)"
    exit 1
fi

# Check for required backend dependencies in package.json
if ! grep -q "express" package.json; then
    echo "⚠️  Warning: Backend dependencies might be missing from package.json."
    echo "   Running install for safety..."
    npm install express express-rate-limit helmet node-cache dotenv @google/genai --save
fi

echo "1. Building Container..."
# Uses Google Cloud Build to build and push the image to GCR
# Requires: gcloud auth login && gcloud config set project $PROJECT_ID
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

echo "2. Deploying to Cloud Run..."
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --env-vars-file .env \
  --port 8080

echo "=================================================="
echo "   🚀 DEPLOYMENT COMPLETE"
echo "   URL: $(gcloud run services describe $APP_NAME --platform managed --region $REGION --format 'value(status.url)')"
echo "=================================================="