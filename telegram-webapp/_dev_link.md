# Dev Link (localhost.run)

## Prerequisites

- SSH client (built-in on macOS/Linux)
- Node.js with npx

## Quick Start

```bash
# From telegram-webapp directory:
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp

# 1. Start local server on port 8080 (using Node http-server for stability)
npx http-server -p 8080 -a 127.0.0.1 > /tmp/httpserver.log 2>&1 &

# 2. Start localhost.run tunnel
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8080 nokey@localhost.run > /tmp/localhost_run.log 2>&1 &

# 3. Get the tunnel URL (wait 5 seconds for tunnel to establish)
sleep 5 && grep -o 'https://[a-z0-9]*\.lhr\.life' /tmp/localhost_run.log | head -1
```

## Step-by-Step

### 1. Start Local Server

```bash
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp
npx http-server -p 8080 -a 127.0.0.1 > /tmp/httpserver.log 2>&1 &
```

**Important:** Use Node.js `http-server` instead of Python's `http.server` - it's more stable and doesn't have IPv6 binding issues.

Server runs on `http://127.0.0.1:8080`

### 2. Kill Any Existing Tunnel

```bash
pkill -f "ssh.*localhost.run"
```

### 3. Start localhost.run Tunnel

```bash
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8080 nokey@localhost.run > /tmp/localhost_run.log 2>&1 &
```

### 4. Get the Public URL

```bash
sleep 5 && grep -o 'https://[a-z0-9]*\.lhr\.life' /tmp/localhost_run.log | head -1
```

Outputs a URL like: `https://73dbe37cc9066d.lhr.life`

### 5. Verify It Works

```bash
curl -sL "$(grep -o 'https://[a-z0-9]*\.lhr\.life' /tmp/localhost_run.log | head -1)" | head -5
```

Should return HTML content.

## Cache Busting

**Important:** When providing a new link to the user, always append a version query parameter to ensure the latest code is loaded:

```
https://73dbe37cc9066d.lhr.life?v=1
https://73dbe37cc9066d.lhr.life?v=2
https://73dbe37cc9066d.lhr.life?v=3
```

Increment the version number each time you provide a new link after code changes.

## Check Status

```bash
# Check if server is running
curl -s http://127.0.0.1:8080/ | head -3

# Check if tunnel is running
pgrep -f "ssh.*localhost.run" && echo "Tunnel running" || echo "Tunnel NOT running"

# Get current URL
grep -o 'https://[a-z0-9]*\.lhr\.life' /tmp/localhost_run.log | head -1
```

## Stop Everything

```bash
pkill -f "ssh.*localhost.run"
pkill -f "http-server"
```

## Troubleshooting

### Python http.server issues
Don't use `python3 -m http.server` - it binds to IPv6 by default and can return empty responses. Use `npx http-server` instead.

### Cloudflare tunnel issues
If cloudflared tunnel gives 502 errors, use localhost.run instead - it's simpler and more reliable.

### Server dies after some time
The background server may stop. Re-run the Quick Start commands to restart everything.
