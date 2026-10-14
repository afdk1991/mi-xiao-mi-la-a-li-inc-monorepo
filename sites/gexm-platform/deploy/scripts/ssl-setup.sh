#!/bin/bash

set -e

DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"
NGINX_CONF="/etc/nginx/conf.d/gexm.conf"
SSL_DIR="/etc/nginx/ssl"

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

install_certbot() {
    log "Installing Certbot and Nginx plugin..."
    if command -v certbot &> /dev/null; then
        log "Certbot is already installed"
        return 0
    fi

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" == "ubuntu" ] || [ "$ID" == "debian" ]; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        elif [ "$ID" == "centos" ] || [ "$ID" == "rhel" ]; then
            yum install -y certbot python3-certbot-nginx
        else
            log "Unsupported distribution, please install certbot manually"
            return 1
        fi
    else
        log "Cannot detect distribution, please install certbot manually"
        return 1
    fi

    log "Certbot installation completed"
}

create_ssl_dir() {
    log "Creating SSL directory..."
    mkdir -p "$SSL_DIR"
    chown -R nginx:nginx "$SSL_DIR"
    chmod 700 "$SSL_DIR"
}

obtain_certificate() {
    log "Obtaining SSL certificate for $DOMAIN..."

    if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
        log "SSL certificate already exists, renewing..."
        certbot renew --nginx --quiet
        return 0
    fi

    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --redirect --non-interactive

    if [ $? -eq 0 ]; then
        log "SSL certificate obtained successfully"
        return 0
    else
        log "Failed to obtain SSL certificate"
        return 1
    fi
}

setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."

    if ! crontab -l | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --nginx --quiet") | crontab -
        log "Added certbot renewal cron job"
    else
        log "Certbot renewal cron job already exists"
    fi

    if ! crontab -l | grep -q "nginx reload"; then
        (crontab -l 2>/dev/null; echo "5 3 * * * certbot renew --nginx --quiet && systemctl reload nginx") | crontab -
        log "Added nginx reload after certbot renewal"
    else
        log "Nginx reload cron job already exists"
    fi
}

verify_certificate() {
    log "Verifying SSL certificate..."
    if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
        log "SSL certificate files exist"
        openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | head -20
        return 0
    else
        log "SSL certificate files not found"
        return 1
    fi
}

main() {
    log "Starting SSL setup for $DOMAIN..."

    install_certbot || exit 1

    create_ssl_dir

    obtain_certificate || exit 1

    setup_auto_renewal

    verify_certificate

    log "SSL setup completed successfully!"
    log "Your site is now accessible at https://$DOMAIN"
}

main "$@"