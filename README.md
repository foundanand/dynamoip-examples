# dynamoip-examples

Example projects showing how to use [dynamoip](https://github.com/foundanand/dynamoip) with Docker.

dynamoip gives your local services real domain names and trusted HTTPS — reachable from any device on your network. These examples show how to run everything inside Docker containers.

---

## Examples

### [multi-service](./multi-service/)

Two apps (inventory + dashboard) and dynamoip all running in Docker. Works on macOS, Linux, and Windows.

```
https://inventory.yourdomain.com  →  Docker container (port 3001)
https://dashboard.yourdomain.com  →  Docker container (port 6000)
```

**What's in it:**
```
multi-service/
├── setup-env.js          Detects your LAN IP and writes .env (run this first)
├── docker-compose.yml    Runs all three services
├── dynamoip.config.json  Domain → port mapping
├── .env.example          Credentials template
├── inventory/            Minimal inventory app
├── dashboard/            Minimal dashboard app
└── dynamoip/             dynamoip container with socat port forwarding
```

**Quick start:**
```bash
cd multi-service
node setup-env.js        # detects LAN IP, creates .env
# fill in CF_API_TOKEN and CF_EMAIL in .env
docker compose up --build
```

---

## Requirements

- [Docker Desktop](https://docs.docker.com/get-docker/) (macOS/Windows) or Docker Engine (Linux)
- Node.js >= 14 (for `setup-env.js`)
- A domain managed by Cloudflare + API token with `Zone:DNS:Edit` permission

## How it works

```
Your machine (192.168.x.x)
  ├── inventory container   → port 3001
  ├── dashboard container   → port 6000
  └── dynamoip container    → ports 80 + 443
        socat bridges localhost:PORT → Docker service name
        dynamoip sets Cloudflare DNS A records to your LAN IP
        Let's Encrypt issues a wildcard certificate
        Any device on the same network opens the URL, no warnings
```
