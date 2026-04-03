#!/bin/sh
set -e

# Install the mkcert CA into the container's system trust store.
# On first run this generates a new CA (persisted in the dynamoip-mkcert volume).
# Subsequent starts reuse the same CA — no new cert issuance needed.
mkcert -install

exec node node_modules/.bin/dynamoip --config /config/dynamoip.config.json
