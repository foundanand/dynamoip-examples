# Stage 1 — install dynamoip
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install dynamoip@latest

# Stage 2 — runner
# Adds socat (localhost:PORT → Docker service) and mkcert (local CA/cert generation).
# Runs as root — required to bind ports 80/443 and run mkcert -install.
FROM node:22-alpine AS runner
ARG TARGETARCH=amd64
RUN apk add --no-cache socat curl && \
    MKCERT_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") && \
    curl -fsSL "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-${MKCERT_ARCH}" \
    -o /usr/local/bin/mkcert && \
    chmod +x /usr/local/bin/mkcert
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# CAROOT is set at runtime via docker-compose environment.
# The host's mkcert CA directory is mounted at that path.
ENTRYPOINT ["./entrypoint.sh"]
