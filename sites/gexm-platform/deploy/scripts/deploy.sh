#!/bin/bash

set -e

APP_NAME="gexm"
APP_DIR="/var/www/${APP_NAME}"
REPO_URL="git@github.com:your-org/gexm.git"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [ -z "$1" ]; then
    log_error "Usage: $0 <environment>"
    log_error "Environments: development, staging, production"
    exit 1
fi

ENV=$1
ENV_FILE=".env.${ENV}"

log "Starting deployment for ${ENV} environment..."

if [ ! -d "${APP_DIR}" ]; then
    log "Creating application directory..."
    sudo mkdir -p "${APP_DIR}"
    sudo chown -R $USER:$USER "${APP_DIR}"
fi

cd "${APP_DIR}"

if [ -d ".git" ]; then
    log "Pulling latest changes from ${BRANCH}..."
    git fetch origin
    git checkout "${BRANCH}"
    git pull origin "${BRANCH}"
else
    log "Cloning repository..."
    git clone "${REPO_URL}" -b "${BRANCH}" .
fi

if [ ! -f "${ENV_FILE}" ]; then
    log_warn "Environment file ${ENV_FILE} not found. Creating from template..."
    cp .env.example "${ENV_FILE}"
    log_warn "Please configure ${ENV_FILE} with proper environment variables"
fi

log "Installing dependencies..."
npm ci --production

log "Building application..."
npm run build

log "Stopping existing service..."
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet "${APP_NAME}"; then
        sudo systemctl stop "${APP_NAME}"
    fi
fi

log "Copying nginx configuration..."
sudo cp "${APP_DIR}/deploy/nginx/gexm.conf" "/etc/nginx/sites-available/${APP_NAME}"
if [ ! -L "/etc/nginx/sites-enabled/${APP_NAME}" ]; then
    sudo ln -s "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/"
fi

log "Testing nginx configuration..."
sudo nginx -t

log "Reloading nginx..."
sudo systemctl reload nginx

log "Starting application service..."
if command -v systemctl &> /dev/null; then
    sudo systemctl start "${APP_NAME}"
    sudo systemctl enable "${APP_NAME}"
else
    log_warn "systemd not available. Starting application manually..."
    nohup npm start > /var/log/${APP_NAME}.log 2>&1 &
fi

log "Waiting for application to start..."
sleep 5

log "Checking health status..."
if curl -s http://localhost:3000/api/health | grep -q "OK"; then
    log "Application deployment completed successfully!"
else
    log_error "Application health check failed!"
    exit 1
fi

log "Deployment finished."
