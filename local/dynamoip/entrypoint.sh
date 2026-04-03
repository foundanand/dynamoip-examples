#!/bin/sh
set -e

# Install the host's mkcert CA into this container's system trust store.
# CAROOT env var (set in docker-compose.yml) points to the host CA directory
# mounted as a read-only volume. mkcert reads the CA from there and registers
# it with the container's certificate store — no new CA is generated.
# This ensures dynamoip issues certs signed by the same CA your host already trusts.
mkcert -install

# Forward localhost:PORT inside this container → the actual Docker service.
# dynamoip always proxies to localhost:PORT, so socat bridges the gap.
# Each FORWARD_<service>=<port> env var creates one forwarder.
#
# Example (set in docker-compose.yml):
#   FORWARD_inventory=3001  →  socat localhost:3001 → inventory:3001
#   FORWARD_dashboard=6000  →  socat localhost:6000 → dashboard:6000

for var in $(env | grep '^FORWARD_'); do
  service=$(echo "$var" | cut -d= -f1 | sed 's/^FORWARD_//')
  port=$(echo "$var" | cut -d= -f2)
  echo "[entrypoint] forwarding localhost:${port} → ${service}:${port}"
  socat TCP-LISTEN:${port},fork,reuseaddr TCP:${service}:${port} &
done

exec node node_modules/.bin/dynamoip --config /config/dynamoip.config.json
