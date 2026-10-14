Write-Host "Stopping PostgreSQL test container..." -ForegroundColor Cyan
docker compose -f f:\gexm\docker-compose.test.yml down -v
Write-Host "Done." -ForegroundColor Green
