# 🚀 GCP Cloud Run Deployment Guide for Telescoper

This guide provides step-by-step instructions to deploy the **Telescoper** application to Google Cloud Platform using Cloud Run, Artifact Registry, and Secret Manager with production-grade security practices.

---

## 📋 Prerequisites

### 1. Install and Authenticate Google Cloud SDK

```bash
# Install gcloud CLI (if not already installed)
# macOS:
brew install google-cloud-sdk

# Verify installation
gcloud --version

# Authenticate
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID

# Verify project
gcloud config get-value project
```

### 2. Enable Required APIs

```bash
# Enable all required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  dns.googleapis.com \
  domains.googleapis.com
```

### 3. Verify Billing

Ensure billing is enabled for your project:

```bash
gcloud billing accounts list
gcloud billing projects link YOUR_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

---

## 🔐 Security Setup

### Step 1: Create Service Account

Create a dedicated service account with minimal privileges for Cloud Run:

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT_NAME="telescoper-cloud-run-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
  --display-name="Telescoper Cloud Run Service Account" \
  --description="Service account for Telescoper Cloud Run service"

# Grant Secret Manager Secret Accessor role (to read secrets)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud Run Invoker role (if needed for authenticated access)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/run.invoker"
```

### Step 2: Create Secrets in Secret Manager

**Important Note:** The application code uses `process.env.API_KEY` for the Gemini API. We'll create the secret as `API_KEY` to match the code. If you prefer `GEMINI_API_KEY`, you'll need to update `server.ts` line 55.

```bash
# Set your API keys (replace with actual values)
GEMINI_API_KEY="your-gemini-api-key-here"
BRAVE_SEARCH_API_KEY="your-brave-api-key-here"  # Optional
GOOGLE_SEARCH_API_KEY="your-google-search-key-here"  # Optional
REDIS_URL="redis://your-redis-host:6379"  # Optional

# Create secrets
echo -n "${GEMINI_API_KEY}" | gcloud secrets create api-key \
  --data-file=- \
  --replication-policy="automatic"

# Create optional secrets (if you have them)
if [ -n "${BRAVE_SEARCH_API_KEY}" ]; then
  echo -n "${BRAVE_SEARCH_API_KEY}" | gcloud secrets create brave-search-api-key \
    --data-file=- \
    --replication-policy="automatic"
fi

if [ -n "${GOOGLE_SEARCH_API_KEY}" ]; then
  echo -n "${GOOGLE_SEARCH_API_KEY}" | gcloud secrets create google-search-api-key \
    --data-file=- \
    --replication-policy="automatic"
fi

if [ -n "${REDIS_URL}" ]; then
  echo -n "${REDIS_URL}" | gcloud secrets create redis-url \
    --data-file=- \
    --replication-policy="automatic"
fi

# Grant service account access to secrets
gcloud secrets add-iam-policy-binding api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to optional secrets
if [ -n "${BRAVE_SEARCH_API_KEY}" ]; then
  gcloud secrets add-iam-policy-binding brave-search-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
fi

if [ -n "${GOOGLE_SEARCH_API_KEY}" ]; then
  gcloud secrets add-iam-policy-binding google-search-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
fi

if [ -n "${REDIS_URL}" ]; then
  gcloud secrets add-iam-policy-binding redis-url \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
fi
```

**Alternative: Update Code to Use GEMINI_API_KEY**

If you prefer to use `GEMINI_API_KEY` instead of `API_KEY`, update `server.ts`:

```bash
# Update line 55 in server.ts
# Change: const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
# To:     const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

Then create the secret as `gemini-api-key`:

```bash
echo -n "${GEMINI_API_KEY}" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

---

## 🐳 Dockerfile Setup

Create or update the `Dockerfile` with a multi-stage build:

```dockerfile
# Stage 1: Build frontend and compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build frontend (Vite)
RUN npm run build

# Compile TypeScript server
RUN npm run build:server

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Expose port
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist-server/server.js"]
```

---

## 🏗️ Build & Push to Artifact Registry

### Step 1: Create Artifact Registry Repository

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"  # Change to your preferred region
REPOSITORY_NAME="telescoper-images"

# Create Artifact Registry repository
gcloud artifacts repositories create ${REPOSITORY_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Docker repository for Telescoper application"

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### Step 2: Build and Push Container Image

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REPOSITORY_NAME="telescoper-images"
IMAGE_NAME="telescoper"
IMAGE_TAG="latest"

# Full image path
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# Build and push using Cloud Build
gcloud builds submit --tag ${IMAGE_URI}

# Verify image was pushed
gcloud artifacts docker images list ${IMAGE_URI}
```

---

## 🚀 Deploy to Cloud Run

### Step 1: Deploy with Secrets

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="telescoper"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/telescoper-images/telescoper:latest"
SERVICE_ACCOUNT_EMAIL="telescoper-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_URI} \
  --platform managed \
  --region ${REGION} \
  --service-account ${SERVICE_ACCOUNT_EMAIL} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-secrets="API_KEY=api-key:latest" \
  --set-env-vars="NODE_ENV=production,PORT=8080"

# If you have optional secrets, add them:
# --set-secrets="BRAVE_SEARCH_API_KEY=brave-search-api-key:latest,GOOGLE_SEARCH_API_KEY=google-search-api-key:latest,REDIS_URL=redis-url:latest"
```

**Note:** If you updated the code to use `GEMINI_API_KEY`, change the secret reference:

```bash
--set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

### Step 2: Verify Deployment

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --format 'value(status.url)')

echo "Service URL: ${SERVICE_URL}"

# Test the service
curl ${SERVICE_URL}

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}" \
  --limit 50 \
  --format json
```

---

## 🌐 Domain Mapping (dr0p.co)

### Step 1: Verify Domain Ownership

#### Option A: Using Google Search Console (Recommended)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `dr0p.co`
3. Verify ownership using one of the provided methods (HTML file, DNS TXT record, etc.)

#### Option B: Using Google Domains / Cloud Domains

```bash
# If you're using Google Domains or Cloud Domains
gcloud domains verify dr0p.co
```

### Step 2: Map Domain to Cloud Run Service

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="telescoper"
DOMAIN="dr0p.co"

# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service ${SERVICE_NAME} \
  --domain ${DOMAIN} \
  --region ${REGION}

# Get the DNS records you need to add
gcloud run domain-mappings describe ${DOMAIN} \
  --region ${REGION} \
  --format="value(status.resourceRecords)"
```

### Step 3: Configure DNS Records

The command above will output DNS records. Add them to your domain's DNS provider:

**Example DNS Records (your actual records may differ):**

```
Type: A
Name: @
Value: [IP address from gcloud output]

Type: AAAA
Name: @
Value: [IPv6 address from gcloud output]

Type: CNAME
Name: www
Value: ghs.googlehosted.com
```

**For common DNS providers:**

- **Cloudflare**: Add A and AAAA records in DNS dashboard
- **Google Domains**: DNS → Custom records
- **Route 53**: Create records in hosted zone
- **Namecheap**: Advanced DNS → Add records

### Step 4: Verify Domain Mapping

```bash
# Check domain mapping status
gcloud run domain-mappings describe ${DOMAIN} \
  --region ${REGION}

# Wait for status to become "ACTIVE" (may take a few minutes)
# Then test:
curl https://${DOMAIN}
```

---

## 🔄 Update Deployment

To update the application after code changes:

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/telescoper-images/telescoper:latest"

# Rebuild and push
gcloud builds submit --tag ${IMAGE_URI}

# Deploy new revision
gcloud run deploy telescoper \
  --image ${IMAGE_URI} \
  --platform managed \
  --region ${REGION}
```

---

## 🛠️ Troubleshooting

### View Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=telescoper" \
  --limit 100 \
  --format json
```

### Check Service Status

```bash
gcloud run services describe telescoper \
  --platform managed \
  --region us-central1
```

### Test Secret Access

```bash
# Test if service account can access secrets
gcloud secrets versions access latest --secret="api-key"
```

### Common Issues

1. **Secret not found**: Ensure secret name matches exactly and service account has `secretAccessor` role
2. **Domain not resolving**: Wait 5-10 minutes after DNS changes, verify DNS records are correct
3. **Build fails**: Check Dockerfile syntax, ensure all dependencies are in `package.json`
4. **Service crashes**: Check logs for missing environment variables or runtime errors

---

## 📊 Monitoring & Scaling

### View Metrics

```bash
# Open Cloud Console
open "https://console.cloud.google.com/run/detail/us-central1/telescoper/metrics?project=${PROJECT_ID}"
```

### Adjust Scaling

```bash
# Update scaling parameters
gcloud run services update telescoper \
  --min-instances 1 \
  --max-instances 20 \
  --cpu 2 \
  --memory 2Gi \
  --region us-central1
```

---

## 🔒 Security Best Practices Checklist

- ✅ Service account with minimal privileges (not default Compute Engine SA)
- ✅ Secrets stored in Secret Manager (not environment variables)
- ✅ Secrets mounted at runtime (not in image)
- ✅ HTTPS enforced (automatic with Cloud Run)
- ✅ Rate limiting configured (in application code)
- ✅ Helmet.js security headers (in application code)
- ✅ Domain verified and properly configured
- ✅ Regular security updates (rebuild images periodically)

---

## 📝 Quick Reference Commands

```bash
# Set project
export PROJECT_ID="your-project-id"
gcloud config set project ${PROJECT_ID}

# Build and deploy (one-liner)
gcloud builds submit --tag us-central1-docker.pkg.dev/${PROJECT_ID}/telescoper-images/telescoper:latest && \
gcloud run deploy telescoper \
  --image us-central1-docker.pkg.dev/${PROJECT_ID}/telescoper-images/telescoper:latest \
  --platform managed \
  --region us-central1 \
  --service-account telescoper-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-secrets="API_KEY=api-key:latest"

# Get service URL
gcloud run services describe telescoper --region us-central1 --format 'value(status.url)'

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=telescoper" --limit 50
```

---

## 🎯 Next Steps

1. Set up Cloud Monitoring alerts for errors and latency
2. Configure Cloud CDN for static asset caching
3. Set up CI/CD pipeline (Cloud Build triggers on git push)
4. Configure custom error pages
5. Set up backup strategy for Redis (if using Memorystore)

---

**Deployment Complete!** 🎉

Your application should now be accessible at `https://dr0p.co` (after DNS propagation).
