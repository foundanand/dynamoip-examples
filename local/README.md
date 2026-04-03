# local

Two apps and dynamoip running in Docker with mDNS `.local` hostnames and mkcert HTTPS. No Cloudflare account needed.

```
https://inventory.local  →  Docker container (port 3001)
https://dashboard.local  →  Docker container (port 6000)
```

> **Linux only.** All containers use `network_mode: host` so dynamoip can broadcast mDNS on your real network interface. Docker Desktop on macOS/Windows runs containers in a Linux VM — host networking reaches the VM's network, not your machine's. On those platforms, run dynamoip directly on the host instead.

## How it works

```
Linux host
  ├── inventory container  — binds to host port 3001 (network_mode: host)
  ├── dashboard container  — binds to host port 6000 (network_mode: host)
  └── dynamoip container   — binds to host ports 80 + 443 (network_mode: host)
        mkcert generates a local CA + certs on first run
        mDNS broadcasts inventory.local / dashboard.local → your LAN IP
        Any device on the same network can reach the URLs
        (after installing the CA cert once — see below)
```

## Structure

```
local/
├── docker-compose.yml
├── dynamoip.config.json  Domain → port mapping (no baseDomain = Quick mode)
├── dynamoip/
│   ├── Dockerfile        Installs dynamoip + mkcert
│   └── entrypoint.sh     Installs mkcert CA then starts dynamoip
├── inventory/
│   ├── Dockerfile
│   ├── server.js
│   ├── index.html
│   └── package.json
└── dashboard/
    ├── Dockerfile
    ├── server.js
    ├── index.html
    └── package.json
```

No `.env` needed — Quick mode requires no credentials.

## Setup

**1. Start everything:**

```bash
docker compose up --build
```

On first run, dynamoip generates a local CA and issues certificates for `inventory.local` and `dashboard.local`. The CA is stored in the `dynamoip-mkcert` volume and reused on subsequent starts.

**2. Install the CA cert on each device (once per device):**

After the first run, export the CA cert:

```bash
docker cp $(docker compose ps -q dynamoip):/root/.local/share/mkcert/rootCA.crt ./rootCA.crt
```

Then install `rootCA.crt` on the device:

| Platform | How |
|---|---|
| macOS | Double-click → Keychain Access → mark as Always Trust |
| Linux | `sudo cp rootCA.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates` |
| Windows | Double-click → Install Certificate → Local Machine → Trusted Root CAs |
| iOS | AirDrop the file → Settings → Profile → Install, then Settings → General → About → Certificate Trust |
| Android | Settings → Security → Install from storage |

You only need to do this once. The same CA is reused across restarts.

**3. Open on any device on the same network:**

```
https://inventory.local
https://dashboard.local
```

## Stopping

```bash
docker compose down
```

The `dynamoip-mkcert` volume is preserved so the CA and certs are reused on next start.

To also remove the volume (forces a fresh CA on next run — all devices will need to reinstall the cert):

```bash
docker compose down -v
```
