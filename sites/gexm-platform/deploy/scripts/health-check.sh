#!/bin/bash

HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/api/health}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
MAX_FAILURES="${MAX_FAILURES:-3}"
ALERT_SCRIPT="${ALERT_SCRIPT:-}"
LOG_FILE="${LOG_FILE:-/var/log/gexm-health-check.log}"

FAILURE_COUNT=0

log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    if [ -n "$ALERT_SCRIPT" ] && [ -x "$ALERT_SCRIPT" ]; then
        "$ALERT_SCRIPT" "$1"
    fi
}

perform_check() {
    local response
    local status_code

    if ! response=$(curl -s -w "%{http_code}" -o /tmp/health_response.txt "$HEALTH_CHECK_URL" 2>/dev/null); then
        log "Connection failed"
        return 1
    fi

    status_code=$(tail -n1 /tmp/health_response.txt)
    response_body=$(head -n-1 /tmp/health_response.txt)

    if [ "$status_code" -eq 200 ]; then
        log "Health check passed (status: $status_code)"
        FAILURE_COUNT=0
        return 0
    else
        log "Health check failed (status: $status_code, response: $response_body)"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        return 1
    fi
}

main() {
    log "Starting health check monitoring..."
    log "Check interval: ${CHECK_INTERVAL}s"
    log "Max failures before alert: ${MAX_FAILURES}"
    log "Health check URL: ${HEALTH_CHECK_URL}"

    while true; do
        if ! perform_check; then
            if [ "$FAILURE_COUNT" -ge "$MAX_FAILURES" ]; then
                log "ALERT: Service has failed ${MAX_FAILURES} consecutive health checks"
                send_alert "Service health check failed ${MAX_FAILURES} times"
                FAILURE_COUNT=0
            fi
        fi
        sleep "$CHECK_INTERVAL"
    done
}

main "$@"