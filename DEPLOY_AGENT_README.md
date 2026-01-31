# 🚀 Deployment Agent Usage Guide

The `deploy-agent.sh` script automates the entire GCP Cloud Run deployment process, following the steps outlined in `GCP_DEPLOYMENT_GUIDE.md`.

## Quick Start

```bash
# Make executable (if not already)
chmod +x deploy-agent.sh

# Run the deployment agent
./deploy-agent.sh
```

The agent will guide you through each step interactively, prompting for required information and validating prerequisites.

## Features

- ✅ **Prerequisite Validation**: Checks for gcloud CLI, authentication, project setup, and billing
- ✅ **Interactive Prompts**: Guides you through each step with clear prompts
- ✅ **Error Handling**: Validates each operation and provides helpful error messages
- ✅ **Idempotent Operations**: Safe to re-run (skips existing resources)
- ✅ **Progress Tracking**: Shows current step and total progress
- ✅ **Color-coded Output**: Easy to read status messages
- ✅ **Flexible Configuration**: Supports environment variables and command-line flags

## Usage Options

### Full Interactive Deployment

```bash
./deploy-agent.sh
```

This will run all steps interactively, prompting for:
- GCP Project ID (if not set)
- API keys (Gemini, Brave, Google Search, Redis)
- Domain configuration

### Skip Specific Steps

If you've already completed some steps, you can skip them:

```bash
# Skip prerequisites check
./deploy-agent.sh --skip-prereqs

# Skip API enabling (if already done)
./deploy-agent.sh --skip-apis

# Skip service account setup (if reusing existing)
./deploy-agent.sh --skip-sa

# Skip secrets setup (if secrets already exist)
./deploy-agent.sh --skip-secrets

# Skip Artifact Registry setup
./deploy-agent.sh --skip-registry

# Skip build (if image already exists)
./deploy-agent.sh --skip-build

# Skip deployment (if just testing setup)
./deploy-agent.sh --skip-deploy

# Skip domain mapping
./deploy-agent.sh --skip-domain
```

### Custom Configuration

Use environment variables or command-line flags:

```bash
# Using environment variables
export GCP_REGION="us-east1"
export GCP_SERVICE_NAME="my-telescoper"
export GCP_DOMAIN="example.com"
./deploy-agent.sh

# Using command-line flags
./deploy-agent.sh --region us-east1 --service-name my-telescoper --domain example.com
```

### Non-Interactive Mode

For CI/CD pipelines or automated deployments:

```bash
# Set all required environment variables first
export GCP_PROJECT_ID="your-project-id"
export GEMINI_API_KEY="your-api-key"
export GCP_REGION="us-central1"
export GCP_SERVICE_NAME="telescoper"

# Run with non-interactive flag (uses defaults/prompts only when necessary)
./deploy-agent.sh --non-interactive
```

## Environment Variables

The agent respects these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GCP_REGION` | `us-central1` | GCP region for deployment |
| `GCP_SERVICE_NAME` | `telescoper` | Cloud Run service name |
| `GCP_REPOSITORY_NAME` | `telescoper-images` | Artifact Registry repository name |
| `GCP_SA_NAME` | `telescoper-cloud-run-sa` | Service account name |
| `GCP_DOMAIN` | `dr0p.co` | Custom domain to map |

## What the Agent Does

1. **Prerequisites Check**
   - Verifies gcloud CLI installation
   - Checks authentication status
   - Validates project configuration
   - Verifies billing status

2. **Enable APIs**
   - Enables all required GCP APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager, etc.)

3. **Service Account Setup**
   - Creates dedicated service account
   - Grants minimal required permissions (Secret Manager access, Cloud Run invoker)

4. **Secrets Management**
   - Reads from `.env` file if available
   - Prompts for API keys if not found
   - Creates/updates secrets in Secret Manager
   - Grants service account access to secrets

5. **Artifact Registry**
   - Creates Docker repository (if needed)
   - Configures Docker authentication

6. **Build & Push**
   - Builds container image using Cloud Build
   - Pushes to Artifact Registry
   - Verifies image was created

7. **Deploy to Cloud Run**
   - Deploys service with proper configuration
   - Mounts secrets from Secret Manager
   - Sets environment variables
   - Configures scaling and resource limits

8. **Domain Mapping** (Optional)
   - Creates domain mapping
   - Provides DNS records to configure

## Example Workflow

```bash
# 1. First-time deployment
./deploy-agent.sh
# Follow prompts, enter API keys when asked

# 2. Update deployment (after code changes)
./deploy-agent.sh --skip-prereqs --skip-apis --skip-sa --skip-secrets --skip-registry
# Only rebuilds and redeploys

# 3. Reconfigure secrets only
./deploy-agent.sh --skip-prereqs --skip-apis --skip-sa --skip-registry --skip-build --skip-deploy --skip-domain
# Only updates secrets
```

## Troubleshooting

### Agent Fails on Prerequisites

```bash
# Manually check prerequisites
gcloud --version
gcloud auth list
gcloud config get-value project
```

### Secrets Already Exist

The agent will detect existing secrets and offer to update them. You can also manually update:

```bash
echo -n "your-new-key" | gcloud secrets versions add api-key --data-file=-
```

### Build Fails

Check the build logs:

```bash
gcloud builds list --limit=1
gcloud builds log [BUILD_ID]
```

### Service Not Responding

Check Cloud Run logs:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=telescoper" --limit 50
```

## Integration with CI/CD

For GitHub Actions or similar:

```yaml
- name: Deploy to Cloud Run
  env:
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: |
    echo "$GEMINI_API_KEY" > .env
    echo "API_KEY=$GEMINI_API_KEY" >> .env
    ./deploy-agent.sh --non-interactive
```

## Security Notes

- ✅ Secrets are never logged or displayed
- ✅ Service account uses minimal permissions
- ✅ Secrets stored in Secret Manager (not in image)
- ✅ HTTPS enforced automatically by Cloud Run

## Next Steps After Deployment

1. **Verify Deployment**
   ```bash
   curl $(gcloud run services describe telescoper --region us-central1 --format 'value(status.url)')
   ```

2. **Set Up Monitoring**
   - Configure Cloud Monitoring alerts
   - Set up error rate alerts
   - Monitor latency and request counts

3. **Configure DNS**
   - Add DNS records provided by the agent
   - Wait for propagation (5-10 minutes)
   - Test domain access

4. **Set Up CI/CD**
   - Create Cloud Build trigger
   - Automate deployments on git push

## Support

For detailed deployment information, see `GCP_DEPLOYMENT_GUIDE.md`.

For application-specific issues, check the main `README.md`.
