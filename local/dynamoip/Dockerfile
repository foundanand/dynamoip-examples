# Stage 1 — install dynamoip
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install dynamoip@latest

# Stage 2 — runner
# Adds mkcert for local CA/cert generation (Quick mode).
# Runs as root — required to bind ports 80/443 and run mkcert -install.
FROM node:22-alpine AS runner
ARG TARGETARCH=amd64
RUN apk add --no-cache curl && \
    MKCERT_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") && \
    curl -fsSL "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-${MKCERT_ARCH}" \
    -o /usr/local/bin/mkcert && \
    chmod +x /usr/local/bin/mkcert
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Config is mounted at runtime via docker-compose volume.
ENTRYPOINT ["./entrypoint.sh"]
