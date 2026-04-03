# dynamoip-examples

Example projects showing how to use [dynamoip](https://github.com/foundanand/dynamoip) with Docker.

dynamoip gives your local services real domain names and trusted HTTPS — reachable from any device on your network. These examples show how to run everything inside Docker containers.

---

## Which example should I use?

| | [local](./local/) | [lan](./lan/) | [tunnel](./tunnel/) |
|---|---|---|---|
| **Mode** | Quick | Pro | Max |
| **Access** | LAN only | LAN only | Public internet |
| **Domain** | `*.local` (mDNS) | `*.yourdomain.com` | `*.yourdomain.com` |
| **SSL** | mkcert (CA install required once) | Let's Encrypt (trusted automatically) | Cloudflare TLS |
| **Cloudflare** | Not needed | Required | Required |
| **Credentials** | None | `CF_API_TOKEN` + `CF_EMAIL` | `CF_API_TOKEN` only |
| **OS** | Linux only | macOS, Linux, Windows | macOS, Linux, Windows |
| **Best for** | Zero-config local dev | LAN access, real domain | Public access, no port config |

---

## Examples

### [local](./local/) — Quick mode

No Cloudflare. No credentials. Uses mDNS `.local` hostnames and mkcert for HTTPS.

```
https://inventory.local  →  Docker container (port 3001)
https://dashboard.local  →  Docker container (port 6000)
```

```bash
cd local
docker compose up --build
# then install the CA cert on each device once (see local/README.md)
```

---

### [lan](./lan/) — Pro mode

Cloudflare DNS A records point to your LAN IP. Let's Encrypt wildcard cert — trusted on all devices automatically.

```
https://inventory.yourdomain.com  →  Docker container (port 3001)
https://dashboard.yourdomain.com  →  Docker container (port 6000)
```

```bash
cd lan
node setup-env.js        # detects LAN IP, creates .env
# fill in CF_API_TOKEN and CF_EMAIL in .env
docker compose up --build
```

---

### [tunnel](./tunnel/) — Max mode

Cloudflare Tunnel — no ports to open, no LAN IP to configure, reachable from anywhere on the internet.

```
https://inventory.yourdomain.com  →  Docker container (port 3001)
https://dashboard.yourdomain.com  →  Docker container (port 6000)
```

```bash
cd tunnel
cp .env.example .env
# fill in CF_API_TOKEN in .env
docker compose up --build
```

---

## Requirements

- [Docker Desktop](https://docs.docker.com/get-docker/) (macOS/Windows) or Docker Engine (Linux)
- `local`: no external requirements
- `lan` / `tunnel`: a domain managed by Cloudflare + API token
- `lan`: Node.js >= 14 (for `setup-env.js`)
