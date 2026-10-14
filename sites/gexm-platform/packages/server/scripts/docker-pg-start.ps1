# Start PostgreSQL test container
Write-Host "Starting PostgreSQL test container..." -ForegroundColor Cyan
docker compose -f f:\gexm\docker-compose.test.yml up -d postgres-test

# Wait for healthcheck
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    $status = docker inspect --format='{{.State.Health.Status}}' gexm-pg-test 2>$null
    if ($status -eq 'healthy') {
        Write-Host "PostgreSQL is ready (attempt $attempt)" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Seconds 2
} while ($attempt -lt $maxAttempts)

Write-Host "PostgreSQL failed to become healthy after $maxAttempts attempts" -ForegroundColor Red
exit 1
