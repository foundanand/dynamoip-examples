# Stage 1 — install
# Full Node image with npm. Installs dynamoip and its production dependencies.
# This stage is discarded — npm, its cache, and build tooling never reach the final image.
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install dynamoip@latest

# Stage 2 — runner
# Minimal runtime image. Adds socat to forward localhost:PORT → Docker service names,
# since dynamoip always proxies to localhost and cannot be configured otherwise.
FROM node:22-alpine AS runner
RUN apk add --no-cache socat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Config is mounted at runtime via docker-compose volume.
ENTRYPOINT ["./entrypoint.sh"]
