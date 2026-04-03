# tunnel — Max mode

Two apps and dynamoip running in Docker, exposed to the public internet via Cloudflare Tunnel.
Works on macOS, Linux, and Windows.

```
https://inventory.yourdomain.com  →  Docker container (port 3001)
https://dashboard.yourdomain.com  →  Docker container (port 6000)
```

No ports to open. No LAN IP to configure. Reachable from anywhere on the internet.

---

## How it works

```
Docker network
  ├── inventory container   — internal port 3001
  ├── dashboard container   — internal port 6000
  └── dynamoip container
        socat: localhost:3001 → inventory container
        socat: localhost:6000 → dashboard container
        dynamoip sets Cloudflare DNS + creates a Cloudflare Tunnel
        cloudflared makes an outbound connection — no inbound ports needed
        Anyone with the URL can reach your services
```

dynamoip always proxies to `localhost:PORT`. socat inside the dynamoip container bridges those localhost ports to the actual Docker service names over the internal Docker network.

---

## Structure

```
tunnel/
├── docker-compose.yml    All services + dynamoip
├── dynamoip.config.json  baseDomain + domain → port mapping (tunnel: true)
├── .env.example          Credentials template
├── dynamoip/
│   ├── Dockerfile        Installs dynamoip, socat, and cloudflared
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
- A domain managed by Cloudflare

---

### Step 1 — Create your `.env`

```bash
cp .env.example .env
```

---

### Step 2 — Fill in your Cloudflare API token

Edit `.env`:

```env
CF_API_TOKEN=your_cloudflare_api_token_here
```

Get a token at Cloudflare Dashboard → My Profile → API Tokens → Create Token. It needs two permissions:
- `Zone:DNS:Edit` — to set DNS records
- `Account:Cloudflare Tunnel:Edit` — to create the tunnel

---

### Step 3 — Set your domain in `dynamoip.config.json`

```json
{
  "baseDomain": "yourdomain.com",
  "domains": {
    "inventory": 3001,
    "dashboard": 6000
  },
  "tunnel": true
}
```

---

### Step 4 — Start everything

```bash
docker compose up --build
```

Docker Compose will:
1. Build all three images
2. Start inventory and dashboard, wait for their healthchecks to pass
3. Start dynamoip — it creates a Cloudflare Tunnel, sets DNS records, and begins proxying

First run takes ~30 seconds for the tunnel to establish. Subsequent starts are faster (tunnel credentials cached in the `dynamoip-tunnels` volume).

---

### Step 5 — Open from anywhere

```
https://inventory.yourdomain.com
https://dashboard.yourdomain.com
```

---

## Stopping

```bash
docker compose down
```

The `dynamoip-tunnels` volume is preserved so tunnel credentials are reused on next start.

To also remove the volume (forces a fresh tunnel on next run):

```bash
docker compose down -v
```

---

## Troubleshooting

**Tunnel not connecting**
→ Check your `CF_API_TOKEN` has both `Zone:DNS:Edit` and `Account:Cloudflare Tunnel:Edit` permissions.

**DNS not resolving**
→ Cloudflare DNS propagation can take 1–2 minutes on first run. Wait and retry.

**`baseDomain` not set**
→ Edit `dynamoip.config.json` and replace `yourdomain.com` with your actual domain.
