# Dev Link (Cloudflare Tunnel)

## Prerequisites

- Cloudflared installed (`brew install cloudflared`)

## Quick Start

```bash
# From telegram-webapp directory:
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp

# 1. Start local server on port 8080
python3 -m http.server 8080 &

# 2. Start Cloudflare tunnel
pkill -f cloudflared 2>/dev/null; sleep 1
nohup cloudflared tunnel --url http://localhost:8080 > /tmp/cloudflared.log 2>&1 &

# 3. Get the tunnel URL (wait 6 seconds for tunnel to establish)
sleep 6 && grep -o 'https://[a-z0-9\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

## Step-by-Step

### 1. Start Local Server

```bash
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp
python3 -m http.server 8080 &
```

Or use npm:
```bash
npm run serve
```

Server runs on `http://localhost:8080`

### 2. Kill Any Existing Tunnel

```bash
pkill -f cloudflared
```

### 3. Start Cloudflare Tunnel

```bash
nohup cloudflared tunnel --url http://localhost:8080 > /tmp/cloudflared.log 2>&1 &
```

### 4. Get the Public URL

```bash
sleep 6 && grep -o 'https://[a-z0-9\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

Outputs a URL like: `https://tremendous-constitutional-supposed-hygiene.trycloudflare.com`

### 5. Verify It Works

```bash
curl -s -o /dev/null -w "%{http_code}" "$(grep -o 'https://[a-z0-9\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)"
```

Should return `200`

## Important Notes

- The tunnel URL changes every time you restart cloudflared
- Local server must be running BEFORE the tunnel can work
- Use `?v=N` query parameter to bust browser cache after changes

## Check Status

```bash
# Check if server is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080

# Check if tunnel is running
pgrep -f cloudflared && echo "Tunnel running" || echo "Tunnel NOT running"

# Get current URL
grep -o 'https://[a-z0-9\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

## Stop Everything

```bash
pkill -f cloudflared
pkill -f "http.server 8080"
```
