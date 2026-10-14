FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/app/package*.json packages/app/

RUN npm ci --workspace=@gexm/shared
RUN npm ci --workspace=@gexm/app

COPY packages/shared/src packages/shared/src
COPY packages/app/src packages/app/src
COPY packages/app/vite.config.js packages/app/
COPY packages/app/pages.json packages/app/
COPY packages/app/manifest.json packages/app/
COPY packages/app/index.html packages/app/

RUN npm run build --workspace=@gexm/shared
RUN npm run build:h5 --workspace=@gexm/app

FROM nginx:alpine AS production

COPY --from=builder /app/packages/app/dist/build/h5 /usr/share/nginx/html

COPY packages/app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]