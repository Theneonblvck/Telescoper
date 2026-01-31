#!/bin/bash

###############################################################################
# 🚀 Telescoper GCP Deployment Agent
# 
# This script shepherds the deployment process following GCP_DEPLOYMENT_GUIDE.md
# It validates prerequisites, sets up security, builds, and deploys to Cloud Run.
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-telescoper}"
REPOSITORY_NAME="${GCP_REPOSITORY_NAME:-telescoper-images}"
SERVICE_ACCOUNT_NAME="${GCP_SA_NAME:-telescoper-cloud-run-sa}"
DOMAIN="${GCP_DOMAIN:-dr0p.co}"

# State tracking
STEP_CURRENT=0
STEP_TOTAL=8
SKIP_STEPS=()

# Helper function to check if step should be skipped
should_skip_step() {
    local step="$1"
    # Use parameter expansion with default empty string to avoid unbound variable errors
    local skip_list="${SKIP_STEPS[*]:-}"
    if [ -z "$skip_list" ]; then
        return 1  # Don't skip if array is empty
    fi
    [[ " ${skip_list} " =~ " ${step} " ]]
}

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Step ${STEP_CURRENT}/${STEP_TOTAL}: $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    local response
    
    if [ "$default" = "y" ]; then
        read -p "$(echo -e "${YELLOW}$prompt [Y/n]: ${NC}")" response
    else
        read -p "$(echo -e "${YELLOW}$prompt [y/N]: ${NC}")" response
    fi
    
    response="${response:-$default}"
    [[ "$response" =~ ^[Yy]$ ]]
}

prompt_input() {
    local prompt="$1"
    local default="${2:-}"
    local response
    
    if [ -n "$default" ]; then
        read -p "$(echo -e "${YELLOW}$prompt [${default}]: ${NC}")" response
        echo "${response:-$default}"
    else
        read -p "$(echo -e "${YELLOW}$prompt: ${NC}")" response
        echo "$response"
    fi
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    fi
    return 0
}

check_prerequisites() {
    log_step "Checking Prerequisites"
    
    local missing=0
    
    # Check gcloud
    if ! check_command gcloud; then
        log_error "gcloud CLI is not installed"
        log_info "Install with: brew install google-cloud-sdk (macOS)"
        missing=1
    else
        log_success "gcloud CLI found: $(gcloud --version | head -n1)"
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_warning "Not authenticated with gcloud"
        log_info "Run: gcloud auth login"
        if prompt_yes_no "Would you like to authenticate now?" "y"; then
            gcloud auth login
            log_success "Authentication complete"
        else
            missing=1
        fi
    else
        log_success "Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
    fi
    
    # Check project
    local project_id
    project_id=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "$project_id" ]; then
        log_warning "No project set"
        project_id=$(prompt_input "Enter your GCP Project ID")
        gcloud config set project "$project_id"
        log_success "Project set to: $project_id"
    else
        log_success "Project: $project_id"
        if ! prompt_yes_no "Use project '$project_id'?" "y"; then
            project_id=$(prompt_input "Enter your GCP Project ID")
            gcloud config set project "$project_id"
            log_success "Project set to: $project_id"
        fi
    fi
    
    # Check billing
    log_info "Checking billing status..."
    if ! gcloud billing projects describe "$project_id" --format="value(billingAccountName)" 2>/dev/null | grep -q .; then
        log_warning "Billing not enabled for project"
        log_info "Enable billing at: https://console.cloud.google.com/billing"
        if ! prompt_yes_no "Continue anyway? (billing required for deployment)" "n"; then
            exit 1
        fi
    else
        log_success "Billing enabled"
    fi
    
    if [ $missing -eq 1 ]; then
        log_error "Prerequisites not met. Please fix the issues above."
        exit 1
    fi
    
    export PROJECT_ID="$project_id"
}

enable_apis() {
    log_step "Enabling Required APIs"
    
    local apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "artifactregistry.googleapis.com"
        "secretmanager.googleapis.com"
        "iam.googleapis.com"
        "dns.googleapis.com"
        "domains.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        log_info "Enabling $api..."
        if gcloud services enable "$api" --project="$PROJECT_ID" 2>&1 | grep -q "ERROR"; then
            log_warning "Failed to enable $api (may already be enabled)"
        else
            log_success "Enabled $api"
        fi
    done
}

setup_service_account() {
    log_step "Setting Up Service Account"
    
    local sa_email="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" --project="$PROJECT_ID" &>/dev/null; then
        log_info "Service account already exists: $sa_email"
        if ! prompt_yes_no "Reuse existing service account?" "y"; then
            log_success "Using existing service account"
            export SERVICE_ACCOUNT_EMAIL="$sa_email"
            return
        fi
    fi
    
    # Create service account
    log_info "Creating service account: $SERVICE_ACCOUNT_NAME"
    if gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="Telescoper Cloud Run Service Account" \
        --description="Service account for Telescoper Cloud Run service" \
        --project="$PROJECT_ID" 2>&1 | grep -q "already exists"; then
        log_warning "Service account already exists"
    else
        log_success "Service account created"
    fi
    
    # Grant roles
    log_info "Granting Secret Manager access..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${sa_email}" \
        --role="roles/secretmanager.secretAccessor" \
        --condition=None &>/dev/null || true
    log_success "Secret Manager access granted"
    
    log_info "Granting Cloud Run Invoker role..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${sa_email}" \
        --role="roles/run.invoker" \
        --condition=None &>/dev/null || true
    log_success "Cloud Run Invoker role granted"
    
    export SERVICE_ACCOUNT_EMAIL="$sa_email"
}

setup_secrets() {
    log_step "Setting Up Secrets in Secret Manager"
    
    # Check for .env file
    local env_file="${SCRIPT_DIR}/.env"
    local gemini_key=""
    local brave_key=""
    local google_key=""
    local redis_url=""
    
    if [ -f "$env_file" ]; then
        log_info "Found .env file, reading values..."
        gemini_key=$(grep -E "^API_KEY=" "$env_file" | cut -d'=' -f2- | tr -d '"' || echo "")
        brave_key=$(grep -E "^BRAVE_SEARCH_API_KEY=" "$env_file" | cut -d'=' -f2- | tr -d '"' || echo "")
        google_key=$(grep -E "^GOOGLE_SEARCH_API_KEY=" "$env_file" | cut -d'=' -f2- | tr -d '"' || echo "")
        redis_url=$(grep -E "^REDIS_URL=" "$env_file" | cut -d'=' -f2- | tr -d '"' || echo "")
    fi
    
    # Prompt for API_KEY if not found
    if [ -z "$gemini_key" ]; then
        log_warning "API_KEY not found in .env file"
        gemini_key=$(prompt_input "Enter your Gemini API Key (required)" "")
        if [ -z "$gemini_key" ]; then
            log_error "API_KEY is required"
            exit 1
        fi
    fi
    
    # Create or update api-key secret
    log_info "Creating/updating api-key secret..."
    if gcloud secrets describe api-key --project="$PROJECT_ID" &>/dev/null; then
        echo -n "$gemini_key" | gcloud secrets versions add api-key --data-file=- --project="$PROJECT_ID"
        log_success "Updated api-key secret"
    else
        echo -n "$gemini_key" | gcloud secrets create api-key \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
        log_success "Created api-key secret"
    fi
    
    # Grant service account access
    gcloud secrets add-iam-policy-binding api-key \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" &>/dev/null || true
    
    # Optional secrets
    local secrets_to_mount="API_KEY=api-key:latest"
    
    if [ -n "$brave_key" ] || prompt_yes_no "Do you have a Brave Search API key?" "n"; then
        if [ -z "$brave_key" ]; then
            brave_key=$(prompt_input "Enter your Brave Search API Key" "")
        fi
        if [ -n "$brave_key" ]; then
            if gcloud secrets describe brave-search-api-key --project="$PROJECT_ID" &>/dev/null; then
                echo -n "$brave_key" | gcloud secrets versions add brave-search-api-key --data-file=- --project="$PROJECT_ID"
            else
                echo -n "$brave_key" | gcloud secrets create brave-search-api-key \
                    --data-file=- \
                    --replication-policy="automatic" \
                    --project="$PROJECT_ID"
            fi
            gcloud secrets add-iam-policy-binding brave-search-api-key \
                --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$PROJECT_ID" &>/dev/null || true
            secrets_to_mount="${secrets_to_mount},BRAVE_SEARCH_API_KEY=brave-search-api-key:latest"
            log_success "Brave Search API key configured"
        fi
    fi
    
    if [ -n "$google_key" ] || prompt_yes_no "Do you have a Google Search API key?" "n"; then
        if [ -z "$google_key" ]; then
            google_key=$(prompt_input "Enter your Google Search API Key" "")
        fi
        if [ -n "$google_key" ]; then
            if gcloud secrets describe google-search-api-key --project="$PROJECT_ID" &>/dev/null; then
                echo -n "$google_key" | gcloud secrets versions add google-search-api-key --data-file=- --project="$PROJECT_ID"
            else
                echo -n "$google_key" | gcloud secrets create google-search-api-key \
                    --data-file=- \
                    --replication-policy="automatic" \
                    --project="$PROJECT_ID"
            fi
            gcloud secrets add-iam-policy-binding google-search-api-key \
                --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$PROJECT_ID" &>/dev/null || true
            secrets_to_mount="${secrets_to_mount},GOOGLE_SEARCH_API_KEY=google-search-api-key:latest"
            log_success "Google Search API key configured"
        fi
    fi
    
    if [ -n "$redis_url" ] || prompt_yes_no "Do you have a Redis URL?" "n"; then
        if [ -z "$redis_url" ]; then
            redis_url=$(prompt_input "Enter your Redis URL (e.g., redis://host:6379)" "")
        fi
        if [ -n "$redis_url" ]; then
            if gcloud secrets describe redis-url --project="$PROJECT_ID" &>/dev/null; then
                echo -n "$redis_url" | gcloud secrets versions add redis-url --data-file=- --project="$PROJECT_ID"
            else
                echo -n "$redis_url" | gcloud secrets create redis-url \
                    --data-file=- \
                    --replication-policy="automatic" \
                    --project="$PROJECT_ID"
            fi
            gcloud secrets add-iam-policy-binding redis-url \
                --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$PROJECT_ID" &>/dev/null || true
            secrets_to_mount="${secrets_to_mount},REDIS_URL=redis-url:latest"
            log_success "Redis URL configured"
        fi
    fi
    
    export SECRETS_TO_MOUNT="$secrets_to_mount"
    log_success "Secrets configured"
}

setup_artifact_registry() {
    log_step "Setting Up Artifact Registry"
    
    local repo_path="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}"
    
    # Check if repository exists
    if gcloud artifacts repositories describe "$REPOSITORY_NAME" \
        --location="$REGION" \
        --project="$PROJECT_ID" &>/dev/null; then
        log_info "Repository already exists: $REPOSITORY_NAME"
    else
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create "$REPOSITORY_NAME" \
            --repository-format=docker \
            --location="$REGION" \
            --description="Docker repository for Telescoper application" \
            --project="$PROJECT_ID"
        log_success "Repository created"
    fi
    
    # Configure Docker authentication
    log_info "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    log_success "Docker authentication configured"
    
    export IMAGE_URI="${repo_path}/telescoper:latest"
}

build_and_push() {
    log_step "Building and Pushing Container Image"
    
    log_info "Building container (this may take several minutes)..."
    log_info "Image URI: $IMAGE_URI"
    
    if gcloud builds submit --tag "$IMAGE_URI" --project="$PROJECT_ID" 2>&1 | tee /tmp/build.log; then
        log_success "Build and push completed"
    else
        log_error "Build failed. Check logs above."
        exit 1
    fi
    
    # Verify image
    log_info "Verifying image..."
    if gcloud artifacts docker images list "$IMAGE_URI" --project="$PROJECT_ID" | grep -q "telescoper"; then
        log_success "Image verified in Artifact Registry"
    else
        log_warning "Could not verify image (may still be processing)"
    fi
}

deploy_to_cloud_run() {
    log_step "Deploying to Cloud Run"
    
    log_info "Deploying service: $SERVICE_NAME"
    log_info "Region: $REGION"
    log_info "Service Account: $SERVICE_ACCOUNT_EMAIL"
    log_info "Secrets: $SECRETS_TO_MOUNT"
    
    local deploy_cmd=(
        "gcloud" "run" "deploy" "$SERVICE_NAME"
        "--image" "$IMAGE_URI"
        "--platform" "managed"
        "--region" "$REGION"
        "--service-account" "$SERVICE_ACCOUNT_EMAIL"
        "--allow-unauthenticated"
        "--port" "8080"
        "--memory" "1Gi"
        "--cpu" "1"
        "--min-instances" "0"
        "--max-instances" "10"
        "--timeout" "300"
        "--concurrency" "80"
        "--set-secrets" "$SECRETS_TO_MOUNT"
        "--set-env-vars" "NODE_ENV=production,PORT=8080"
        "--project" "$PROJECT_ID"
    )
    
    if "${deploy_cmd[@]}"; then
        log_success "Deployment completed"
    else
        log_error "Deployment failed"
        exit 1
    fi
    
    # Get service URL
    local service_url
    service_url=$(gcloud run services describe "$SERVICE_NAME" \
        --platform managed \
        --region "$REGION" \
        --format 'value(status.url)' \
        --project="$PROJECT_ID")
    
    export SERVICE_URL="$service_url"
    log_success "Service URL: $service_url"
    
    # Test service
    log_info "Testing service..."
    if curl -s -o /dev/null -w "%{http_code}" "$service_url" | grep -q "200\|404"; then
        log_success "Service is responding"
    else
        log_warning "Service may not be ready yet (this is normal, wait a moment)"
    fi
}

setup_domain() {
    log_step "Setting Up Domain Mapping"
    
    if ! prompt_yes_no "Would you like to map domain '$DOMAIN' to the service?" "y"; then
        log_info "Skipping domain mapping"
        return
    fi
    
    log_info "Creating domain mapping for $DOMAIN..."
    
    # Check if mapping exists
    if gcloud run domain-mappings describe "$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID" &>/dev/null; then
        log_info "Domain mapping already exists"
    else
        if gcloud run domain-mappings create \
            --service "$SERVICE_NAME" \
            --domain "$DOMAIN" \
            --region "$REGION" \
            --project="$PROJECT_ID"; then
            log_success "Domain mapping created"
        else
            log_error "Failed to create domain mapping"
            log_info "You may need to verify domain ownership first"
            log_info "See: https://console.cloud.google.com/run/domains"
            return
        fi
    fi
    
    # Get DNS records
    log_info "Retrieving DNS records..."
    local dns_records
    dns_records=$(gcloud run domain-mappings describe "$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="value(status.resourceRecords)" 2>/dev/null || echo "")
    
    if [ -n "$dns_records" ]; then
        echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}DNS Records to Add:${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo "$dns_records"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        log_info "Add these DNS records to your domain provider"
        log_info "Wait 5-10 minutes for DNS propagation after adding records"
    else
        log_warning "Could not retrieve DNS records (domain may need verification)"
    fi
}

show_summary() {
    log_step "Deployment Summary"
    
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Deployment Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${CYAN}Service Information:${NC}"
    echo -e "  Project ID:     ${PROJECT_ID}"
    echo -e "  Service Name:   ${SERVICE_NAME}"
    echo -e "  Region:        ${REGION}"
    echo -e "  Service URL:   ${SERVICE_URL:-N/A}"
    if [ -n "${DOMAIN:-}" ]; then
        echo -e "  Domain:        ${DOMAIN}"
    fi
    echo ""
    
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  View logs:     gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit 50"
    echo -e "  View service:  gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
    echo -e "  Update:        gcloud builds submit --tag ${IMAGE_URI} && gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_URI} --region ${REGION}"
    echo ""
    
    if [ -n "${SERVICE_URL:-}" ]; then
        echo -e "${GREEN}🌍 Your application is available at: ${SERVICE_URL}${NC}\n"
    fi
}

# Main execution
main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                             ║"
    echo "║              🚀 Telescoper GCP Deployment Agent                             ║"
    echo "║                                                                             ║"
    echo "║         Automated deployment following GCP_DEPLOYMENT_GUIDE.md            ║"
    echo "║                                                                             ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    # Check for skip flags
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-prereqs)
                SKIP_STEPS+=("prereqs")
                shift
                ;;
            --skip-apis)
                SKIP_STEPS+=("apis")
                shift
                ;;
            --skip-sa)
                SKIP_STEPS+=("sa")
                shift
                ;;
            --skip-secrets)
                SKIP_STEPS+=("secrets")
                shift
                ;;
            --skip-registry)
                SKIP_STEPS+=("registry")
                shift
                ;;
            --skip-build)
                SKIP_STEPS+=("build")
                shift
                ;;
            --skip-deploy)
                SKIP_STEPS+=("deploy")
                shift
                ;;
            --skip-domain)
                SKIP_STEPS+=("domain")
                shift
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --service-name)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --non-interactive)
                export NON_INTERACTIVE=1
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Usage: $0 [--skip-<step>] [--region REGION] [--service-name NAME] [--domain DOMAIN] [--non-interactive]"
                exit 1
                ;;
        esac
    done
    
    # Execute steps
    if ! should_skip_step "prereqs"; then
        check_prerequisites
    fi
    
    if ! should_skip_step "apis"; then
        enable_apis
    fi
    
    if ! should_skip_step "sa"; then
        setup_service_account
    fi
    
    if ! should_skip_step "secrets"; then
        setup_secrets
    fi
    
    if ! should_skip_step "registry"; then
        setup_artifact_registry
    fi
    
    if ! should_skip_step "build"; then
        build_and_push
    fi
    
    if ! should_skip_step "deploy"; then
        deploy_to_cloud_run
    fi
    
    if ! should_skip_step "domain"; then
        setup_domain
    fi
    
    show_summary
}

# Run main function
main "$@"
