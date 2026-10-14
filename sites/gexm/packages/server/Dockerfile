FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/server/package*.json packages/server/

RUN npm ci --workspace=@gexm/shared
RUN npm ci --workspace=@gexm/server

COPY packages/shared/src packages/shared/src
COPY packages/server/src packages/server/src
COPY packages/server/tsconfig.json packages/server/

RUN npm run build --workspace=@gexm/shared
RUN npm run build --workspace=@gexm/server

FROM node:20-alpine AS production

WORKDIR /app/packages/server

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist .
COPY --from=builder /app/packages/server/package*.json ./

RUN npm ci --only=production --workspace=@gexm/server
RUN mkdir -p data uploads logs

EXPOSE 3000

CMD ["node", "dist/server.js"]