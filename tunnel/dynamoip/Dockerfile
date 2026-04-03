# Stage 1 — install dynamoip from local package
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install dynamoip@latest

# Stage 2 — runner
# Adds socat (localhost:PORT → Docker service) and cloudflared (tunnel daemon).
FROM node:22-alpine AS runner
ARG TARGETARCH=amd64
RUN apk add --no-cache socat curl && \
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${TARGETARCH}" \
    -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
