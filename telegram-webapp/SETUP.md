# Telegram Web App Game - Setup Guide

## GitHub Repository

```
git@github.com:NikitaZhidkov/idle_wizard.git
```

## Production Hosting (GitHub Pages)

The game is hosted on GitHub Pages:

**Live URL:** https://nikitazhidkov.github.io/idle_wizard/telegram-webapp/index.html

### Deploying Updates

```bash
git add .
git commit -m "Your commit message"
git push origin master
```

GitHub Pages will automatically deploy changes within 1-2 minutes.

### Configure BotFather for Production

1. Open **@BotFather** on Telegram
2. Send `/mybots`
3. Select your bot
4. Go to **Bot Settings** → **Menu Button** (or **Configure Mini App**)
5. Set the URL to: `https://nikitazhidkov.github.io/idle_wizard/telegram-webapp/index.html`

---

## Local Development (Cloudflare Tunnel)

For testing changes before pushing to production.

### Prerequisites

- Python 3 (for local HTTP server)
- Cloudflared (install via `brew install cloudflared`)

### Quick Start (Single Command)

Run this from the project root to start both server and tunnel:

```bash
# Kill any existing processes first
pkill -f cloudflared; pkill -f "http.server 8080"; sleep 1

# Start HTTP server in background with nohup (keeps it running)
cd telegram-webapp && nohup python3 -m http.server 8080 > /tmp/httpserver.log 2>&1 &

# Wait for server to start, then verify it's running
sleep 2 && curl -s -o /dev/null -w "HTTP Server Status: %{http_code}\n" http://localhost:8080/

# Start Cloudflare tunnel (will output the public URL)
nohup cloudflared tunnel --url http://localhost:8080 > /tmp/cloudflared.log 2>&1 &

# Wait for tunnel to establish, then extract the URL
sleep 6 && grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log
```

### Step-by-Step Instructions

#### Step 1: Clean up any existing processes

```bash
pkill -f cloudflared
pkill -f "http.server 8080"
sleep 1
```

#### Step 2: Start HTTP server on port 8080

Navigate to the `telegram-webapp` directory and start the server:

```bash
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp
nohup python3 -m http.server 8080 > /tmp/httpserver.log 2>&1 &
```

**IMPORTANT:** Use `nohup` to prevent the server from dying when the terminal closes.

#### Step 3: Verify HTTP server is running

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
```

Expected output: `200`

If you get `000` or connection refused, the server failed to start. Check logs:
```bash
cat /tmp/httpserver.log
```

Common issue: Port already in use. Kill existing process:
```bash
lsof -ti:8080 | xargs kill -9
```

#### Step 4: Start Cloudflare Tunnel

```bash
nohup cloudflared tunnel --url http://localhost:8080 > /tmp/cloudflared.log 2>&1 &
```

**IMPORTANT:**
- Use `nohup` to keep the tunnel running
- The tunnel connects to localhost:8080, so the HTTP server MUST be running first

#### Step 5: Wait and extract the public URL

```bash
sleep 6 && grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log
```

This outputs a URL like: `https://some-random-words.trycloudflare.com`

Your game is accessible at: `<tunnel-url>/index.html`

#### Step 6: Verify everything works

Test the tunnel is proxying correctly:
```bash
curl -s -o /dev/null -w "%{http_code}" "$(grep -o 'https://[a-z\-]*\.trycloudflare\.com' /tmp/cloudflared.log)/index.html"
```

Expected output: `200`

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `503 Bad Gateway` | HTTP server not running | Restart HTTP server (Step 2) |
| `Error 1033` / `Tunnel error` | Tunnel disconnected | Restart tunnel (Step 4) |
| `Address already in use` | Port 8080 occupied | Run `lsof -ti:8080 \| xargs kill -9` |
| `000` from curl | Server not responding | Check logs: `cat /tmp/httpserver.log` |

### Check running processes

```bash
# Check if HTTP server is running
pgrep -f "http.server 8080" && echo "HTTP server running" || echo "HTTP server NOT running"

# Check if cloudflared is running
pgrep -f cloudflared && echo "Cloudflared running" || echo "Cloudflared NOT running"
```

### View logs

```bash
# HTTP server logs
tail -f /tmp/httpserver.log

# Cloudflare tunnel logs
tail -f /tmp/cloudflared.log
```

### Stop everything

```bash
pkill -f cloudflared
pkill -f "http.server 8080"
```

### Configure BotFather for Testing

Update BotFather with the cloudflare tunnel URL for testing.

### Notes

- The cloudflare tunnel URL changes each time you restart the tunnel
- Both HTTP server and cloudflared must be running simultaneously
- The HTTP server MUST start before the cloudflare tunnel
- The game saves progress to localStorage in the browser
- Always use `nohup` to prevent processes from dying

---

## Bot Token

Store your bot token securely (e.g., in a local `.env` file or password manager).

Never commit bot tokens to public repositories.
