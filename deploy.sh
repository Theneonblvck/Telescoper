#!/bin/bash
set -e

# --- Configuration ---
APP_NAME="telescope-app"
REGION="us-central1"

echo "=================================================="
echo "   🔭 TELESCOPE DEPLOYMENT SCRIPT"
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
echo "✅ Using Project: $PROJECT_ID"

# 3. Enable Required Services (Idempotent)
echo "🔄 Ensuring Cloud APIs are enabled..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# 4. Build Container
echo "🏗️  Building Container (this may take a few minutes)..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

# 5. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --env-vars-file .env \
  --port 8080 \
  --memory 512Mi

echo "=================================================="
echo "   ✨ DEPLOYMENT COMPLETE"
echo "   🌍 URL: $(gcloud run services describe $APP_NAME --platform managed --region $REGION --format 'value(status.url)')"
echo "=================================================="
