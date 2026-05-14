# Frontend Dockerfile - Vite static app with a tiny API proxy
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
ENV NEXT_PUBLIC_DEVELOPMENT_MODE=false
ENV NEXT_PUBLIC_DISABLE_AUTH=true
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 sagefrontend

RUN npm init -y \
  && npm install express@4.18.2 --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=builder --chown=sagefrontend:nodejs /app/dist ./dist
COPY --from=builder --chown=sagefrontend:nodejs /app/server.mjs ./server.mjs

USER sagefrontend
EXPOSE 3000

CMD ["node", "server.mjs"]
