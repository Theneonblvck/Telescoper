# 🔭 TeleScope Deployment Guide

This guide walks you through deploying **TeleScope** to Google Cloud Run. The application uses a "Backend-for-Frontend" (BFF) architecture where a single Node.js container serves the React frontend and handles API requests.

## Prerequisites

1.  **Google Cloud SDK**: Installed and authenticated (`gcloud auth login`).
2.  **Docker**: Installed and running (for local testing, though Cloud Build handles the actual deployment build).
3.  **Project ID**: A Google Cloud Project with billing enabled.
4.  **Redis (Optional but Recommended)**: A Redis instance (e.g., Google Cloud Memorystore or a self-hosted instance) for caching. If not provided, caching is disabled.

---

## Step 1: Configuration

1.  **Environment Variables**:
    Ensure you have a `.env` file in the project root. This file is **not** committed to git but is used by the deployment script to inject secrets.

    ```env
    API_KEY=your_gemini_api_key
    BRAVE_SEARCH_API_KEY=your_brave_key
    GOOGLE_SEARCH_API_KEY=your_google_search_key
    GOOGLE_CSE_ID=your_custom_search_engine_id
    REDIS_URL=redis://<ip>:<port> 
    ```
    *Note: For local development, `REDIS_URL` defaults to `redis://localhost:6379` if omitted.*

2.  **Select Project**:
    Set your active project in the CLI.
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

---

## Step 2: Automated Deployment

We have prepared a script that handles building the Docker image, pushing it to the Google Container Registry, and deploying it to Cloud Run.

1.  **Make the script executable**:
    ```bash
    chmod +x deploy.sh
    ```

2.  **Run the script**:
    ```bash
    ./deploy.sh
    ```

    **What this script does:**
    *   Checks for your `.env` file.
    *   Enables necessary Google Cloud APIs (Cloud Build, Cloud Run).
    *   Uploads your code (excluding `node_modules` thanks to `.gcloudignore`) to Cloud Build.
    *   Builds the Docker image using the `Dockerfile`.
    *   Deploys the image to Cloud Run with the variables from `.env`.

---

## Step 3: Manual Deployment (Alternative)

If you prefer to run commands manually or debug the process:

1.  **Build the Image**:
    ```bash
    gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/telescope-app
    ```

2.  **Deploy**:
    ```bash
    gcloud run deploy telescope-app \
      --image gcr.io/$(gcloud config get-value project)/telescope-app \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --env-vars-file .env \
      --port 8080
    ```

---

## Step 4: Verification

1.  **Access the URL**: The deployment script will output a URL (e.g., `https://telescope-app-xyz-uc.a.run.app`).
2.  **Check Network Traffic**: Open Chrome DevTools (F12) -> Network.
    *   Perform a search.
    *   Verify requests go to `https://<your-app>/api/brave/search` (or similar).
    *   **Crucially**: Verify that your API Keys (`API_KEY`, etc.) are **NOT** visible in the Request Headers or Payload. They should stay on the server.

---

## Troubleshooting

*   **Error: "Generated video/content not found" or 500 Errors**:
    *   Check Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=telescope-app" --limit 20`
    *   Ensure your API Keys in `.env` are valid.
*   **Redis Connection Errors**:
    *   If using Google Cloud Memorystore, ensure your Cloud Run service is connected to the same VPC via a "Serverless VPC Access Connector".
    *   Check logs for "Redis connection failed". The app will still function but without caching.
*   **Build fails on `npm ci`**:
    *   Ensure `package-lock.json` is consistent with `package.json`. If in doubt, delete `package-lock.json` locally, run `npm install`, and try deploying again.
*   **Rate Limits**:
    *   If you hit rate limits immediately, remember the app enforces strict limits on search endpoints (20 req / 15 min).
