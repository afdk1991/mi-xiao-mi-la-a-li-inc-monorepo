#!/bin/sh
set -e

chown -R node:node /app/packages/server/data /app/packages/server/uploads /app/packages/server/logs
chmod -R 750 /app/packages/server/data /app/packages/server/uploads /app/packages/server/logs

exec su-exec node node dist/server.js