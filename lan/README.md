# lan — Pro mode

Two apps and dynamoip running in Docker, exposed with trusted HTTPS across your LAN.
Works on macOS, Linux, and Windows.

```
https://inventory.yourdomain.com  →  Docker container (port 3001)
https://dashboard.yourdomain.com  →  Docker container (port 6000)
```

---

## How it works

```
Your machine (192.168.x.x)
  ├── inventory container   — internal port 3001
  ├── dashboard container   — internal port 6000
  └── dynamoip container    — ports 80 + 443 mapped from host
        socat: localhost:3001 → inventory container
        socat: localhost:6000 → dashboard container
        dynamoip sets Cloudflare DNS A records → your LAN IP
        Let's Encrypt issues a wildcard certificate
        Any device on the same network opens the URL, no warnings
```

dynamoip always proxies to `localhost:PORT`. Since each container has its own network namespace, socat runs inside the dynamoip container to bridge `localhost:PORT` to the actual Docker service name. This is what makes it work on macOS and Windows (Docker Desktop) as well as Linux — no `network_mode: host` needed.

---

## Structure

```
lan/
├── setup-env.js          Run first — detects LAN IP, creates .env
├── docker-compose.yml    All services + dynamoip
├── dynamoip.config.json  baseDomain + domain → port mapping
├── .env.example          Credentials template
├── dynamoip/
│   ├── Dockerfile        Multi-stage: installs dynamoip + socat
│   └── entrypoint.sh     Starts socat forwarders then dynamoip
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

---

## Setup

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (macOS/Windows) or Docker Engine (Linux)
- Node.js >= 14
- A domain managed by Cloudflare

---

### Step 1 — Detect your LAN IP and create `.env`

```bash
node setup-env.js
```

This detects your machine's LAN IP using the OS-native command:
- macOS: `ipconfig getifaddr en0` (falls back to en1, en2)
- Linux: `hostname -I`
- Windows: PowerShell `Get-NetIPAddress` filtered to DHCP-assigned IPv4

It seeds `.env` from `.env.example` and writes `LAN_IP` into it. If detection fails, it prints a clear error and exits — do not proceed until it succeeds.

---

### Step 2 — Fill in your Cloudflare credentials

Edit `.env`:

```env
CF_API_TOKEN=your_cloudflare_api_token_here
CF_EMAIL=you@example.com
```

Get a token at Cloudflare Dashboard → My Profile → API Tokens → Create Token, using the **Edit zone DNS** template scoped to your domain.

---

### Step 3 — Set your domain in `dynamoip.config.json`

```json
{
  "baseDomain": "yourdomain.com",
  "domains": {
    "inventory": 3001,
    "dashboard": 6000
  }
}
```

---

### Step 4 — Start everything

```bash
docker compose up --build
```

If `LAN_IP` is missing from `.env`, Docker Compose will refuse to start with a clear error pointing back to `node setup-env.js`.

Docker Compose will:
1. Build all three images
2. Start inventory and dashboard, wait for their healthchecks to pass
3. Start dynamoip — it sets DNS A records in Cloudflare, obtains a Let's Encrypt wildcard certificate, and begins proxying

First run takes ~1 minute for certificate issuance. Subsequent starts are instant (cert cached in the `dynamoip-certs` volume).

---

### Step 5 — Open on any device on the same network

```
https://inventory.yourdomain.com
https://dashboard.yourdomain.com
```

No certificate warnings. No setup on other devices.

---

## Stopping

```bash
docker compose down
```

The `dynamoip-certs` volume is preserved so the certificate is reused on next start.

To also remove the volume (forces a fresh certificate on next run):

```bash
docker compose down -v
```

---

## Troubleshooting

**`LAN_IP is not set` error when running `docker compose up`**
→ Run `node setup-env.js` first.

**Certificate warning in browser**
→ Let's Encrypt certificates are universally trusted — if you're seeing a warning, the cert hasn't been issued yet. Wait ~1 minute on first run.

**Services unreachable from other devices**
→ Check that `LAN_IP` in `.env` matches your machine's actual LAN IP. Re-run `node setup-env.js` to refresh it.

**Port 80 or 443 already in use**
→ Another process is bound to those ports. Stop it, then run `docker compose up` again.
