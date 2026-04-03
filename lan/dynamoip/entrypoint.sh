#!/bin/sh
set -e

# Forward localhost:PORT inside this container → the actual Docker service.
# dynamoip always proxies to localhost:PORT, so we bridge the gap here using socat.
# Each FORWARD_<service>=<port> env var creates one forwarder.
#
# Example (set in docker-compose.yml):
#   FORWARD_inventory=3001
#   FORWARD_dashboard=6000
#
# Results in:
#   socat TCP-LISTEN:3001 → TCP:inventory:3001
#   socat TCP-LISTEN:6000 → TCP:dashboard:6000

for var in $(env | grep '^FORWARD_'); do
  service=$(echo "$var" | cut -d= -f1 | sed 's/^FORWARD_//')
  port=$(echo "$var" | cut -d= -f2)
  echo "[entrypoint] forwarding localhost:${port} → ${service}:${port}"
  socat TCP-LISTEN:${port},fork,reuseaddr TCP:${service}:${port} &
done

exec node node_modules/.bin/dynamoip --config /config/dynamoip.config.json
