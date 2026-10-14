FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/pc/package*.json packages/pc/

RUN npm ci --workspace=@gexm/pc

COPY packages/pc/src packages/pc/src
COPY packages/pc/vite.config.ts packages/pc/
COPY packages/pc/tsconfig.json packages/pc/
COPY packages/pc/index.html packages/pc/

RUN npm run build --workspace=@gexm/pc

FROM nginx:alpine AS production

COPY --from=builder /app/packages/pc/dist /usr/share/nginx/html

COPY packages/pc/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]