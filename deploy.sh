#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Configuration
PROJECT_ID="gen-lang-client-0084405201" # Based on user's URL
SERVICE_NAME="telescope"
REGION="us-west1" # Based on user's URL
IMAGE_url="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "Deploying $SERVICE_NAME to $REGION in project $PROJECT_ID..."

# 0. Prerequisites Check
echo "Checking prerequisites..."

if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

if ! command -v gcloud &> /dev/null; then
  # Try to find gcloud in common Homebrew locations and add to PATH
  if [ -f "/usr/local/share/google-cloud-sdk/bin/gcloud" ]; then
    export PATH="/usr/local/share/google-cloud-sdk/bin:$PATH"
  elif [ -f "/opt/homebrew/share/google-cloud-sdk/bin/gcloud" ]; then
    export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
  fi
fi

if ! command -v gcloud &> /dev/null; then
  echo "Error: 'gcloud' command not found. Please install the Google Cloud SDK or ensure it is in your PATH."
  exit 1
fi

# 1. Build Docker Image
echo "Building Container..."
# Use --platform linux/amd64 for compatibility with Cloud Run if building from M1 Mac
docker build --platform linux/amd64 -t $IMAGE_url .

# 2. Push to Container Registry
echo "Pushing Container..."
docker push $IMAGE_url

# 3. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
# Note: We are setting secrets/env vars here. Ideally use Secret Manager.
# For now, we will prompt or assume they are set in the Cloud Run service already.
# Or we can update them here.
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_url \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production

echo "Deployment Complete!"
