# multi-service

Two apps and dynamoip all running in Docker, exposed with trusted HTTPS across your LAN.

```
https://inventory.dynamoip.com  →  localhost:3000  (Docker, host network)
https://dashboard.dynamoip.com  →  localhost:6000  (Docker, host network)
```

> **Linux only.** All three containers use `network_mode: host` so dynamoip can detect
> the real LAN IP and bind to ports 80/443. Docker Desktop on macOS runs containers
> in a Linux VM — host networking gives the VM's IP, not your Mac's LAN IP, so this
> setup will not work there. On macOS, run dynamoip on the host instead.

## How it works

```
Linux host (192.168.x.x)
  ├── inventory container  — binds to host port 3000 (network_mode: host)
  ├── dashboard container  — binds to host port 6000 (network_mode: host)
  └── dynamoip container   — binds to host ports 80 + 443 (network_mode: host)
        sees real LAN IP → sets Cloudflare DNS A records correctly
        localhost:3000 / localhost:6000 reachable → proxies traffic in
```

Because all containers share the host's network stack, dynamoip sees `localhost:3000` and `localhost:6000` as if the apps were running directly on the host.

## Structure

```
multi-service/
├── docker-compose.yml
├── dynamoip.config.json
├── .env.example
├── dynamoip/
│   └── Dockerfile          Installs dynamoip via npm (multi-stage)
├── inventory/
│   ├── Dockerfile          Multi-stage, node:22-alpine runner
│   ├── server.js
│   ├── index.html
│   └── package.json
└── dashboard/
    ├── Dockerfile          Multi-stage, node:22-alpine runner
    ├── server.js
    ├── index.html
    └── package.json
```

## Setup

**1. Detect your LAN IP and create `.env`:**

```bash
node setup-env.js
```

This detects your machine's LAN IP using the OS-native command (macOS: `ipconfig`, Linux: `hostname -I`, Windows: PowerShell `Get-NetIPAddress`), seeds `.env` from `.env.example`, and writes `LAN_IP` into it. If detection fails, it prints a clear error and exits — do not proceed until it succeeds.

**2. Fill in your Cloudflare credentials in `.env`:**

```env
CF_API_TOKEN=your_cloudflare_api_token_here
CF_EMAIL=you@example.com
```

Get a token at Cloudflare Dashboard → My Profile → API Tokens → Create Token, using the **Edit zone DNS** template scoped to your domain.

**3. Start everything:**

```bash
docker compose up --build -d
```

If `LAN_IP` is missing from `.env`, Docker Compose will refuse to start with a clear error pointing back to `node setup-env.js`.

Docker Compose will:
1. Build all three images (multi-stage, minimal runners)
2. Start inventory and dashboard, wait for their healthchecks to pass
3. Start dynamoip — it sets DNS A records in Cloudflare, obtains a Let's Encrypt certificate, and begins proxying

First run takes ~1 minute for certificate issuance. Subsequent starts are instant (cert cached in the `dynamoip-certs` volume).

**3. Open on any device on the same Wi-Fi:**

```
https://inventory.dynamoip.com
https://dashboard.dynamoip.com
```

No certificate warnings. No setup on other devices.

## Stopping

```bash
docker compose down
```

The `dynamoip-certs` volume is preserved so the certificate is reused on next start.

To also remove the volume (forces fresh certificate on next run):

```bash
docker compose down -v
```
