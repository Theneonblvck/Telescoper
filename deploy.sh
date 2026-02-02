#!/bin/bash
set -e

# --- Configuration ---
# Changing name to ensure we don't conflict with your broken 'telescoper2' service
APP_NAME="telescope-v1"
REGION="us-central1"

echo "=================================================="
echo "   🔭 TELESCOPE DEPLOYMENT: $APP_NAME"
echo "=================================================="

# 1. Validate Environment
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create a .env file with your API keys."
    exit 1
fi

# 2. Detect Google Cloud Project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No active Google Cloud project found."
    echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi
echo "✅ Project: $PROJECT_ID"

# 3. Check for Dockerfile
if [ ! -f Dockerfile ]; then
    echo "❌ Error: Dockerfile not found."
    exit 1
fi

# 4. Enable Required Services
echo "🔄 Enabling Cloud APIs (this may take a moment)..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com > /dev/null 2>&1

# 5. Build & Deploy
echo "🚀 Building and Deploying to Cloud Run..."
echo "   (This takes about 2-3 minutes)"

gcloud run deploy $APP_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --env-vars-file .env \
  --port 8080 \
  --memory 1Gi

echo "=================================================="
echo "   ✨ DEPLOYMENT COMPLETE"
echo "   🌍 URL: $(gcloud run services describe $APP_NAME --platform managed --region $REGION --format 'value(status.url)')"
echo "=================================================="
