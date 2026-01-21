# Dev Link Setup (Cloudflare Tunnel + Vite)

## Prerequisites

- Vite dev server running on port 3000
- Cloudflared installed (`brew install cloudflared`)

## Quick Start

```bash
# 1. Start Vite dev server (in telegram-webapp/src directory)
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp/src
npm run dev

# 2. In another terminal, start Cloudflare tunnel
pkill -f cloudflared 2>/dev/null; sleep 1
nohup cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &

# 3. Get the tunnel URL (wait 6 seconds for tunnel to establish)
sleep 6 && grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

## Step-by-Step

### 1. Start Vite Dev Server

```bash
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp/src
npm run dev
```

Vite will start on `http://localhost:3000`

### 2. Kill Any Existing Tunnel

```bash
pkill -f cloudflared
```

### 3. Start Cloudflare Tunnel

```bash
nohup cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &
```

### 4. Get the Public URL

```bash
sleep 6 && grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

This outputs a URL like: `https://trees-heater-lenses-tucson.trycloudflare.com`

### 5. Verify It Works

```bash
curl -s -o /dev/null -w "%{http_code}" "$(grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)"
```

Should return `200`

## Important Notes

- The tunnel URL changes every time you restart cloudflared
- Vite must be running BEFORE the tunnel can work
- The tunnel proxies to localhost:3000 (Vite's default port)
- Use `?v=N` query parameter to bust browser cache after changes

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `503 Bad Gateway` | Vite dev server not running - start it first |
| No URL in log | Wait longer, or check `cat /tmp/cloudflared.log` for errors |
| `000` from curl | Tunnel not established yet - wait and retry |

## Check Status

```bash
# Check if Vite is running
pgrep -f "vite" && echo "Vite running" || echo "Vite NOT running"

# Check if tunnel is running
pgrep -f cloudflared && echo "Tunnel running" || echo "Tunnel NOT running"

# Get current URL
grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1
```

## Stop Everything

```bash
pkill -f cloudflared
# Stop Vite with Ctrl+C in its terminal
```
