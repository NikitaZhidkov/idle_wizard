# Telegram Web App Game - Local Development Setup

## Prerequisites

- Python 3 (for local HTTP server)
- Cloudflared (install via `brew install cloudflared`)

## Running the Game Locally

### 1. Start a local HTTP server

```bash
cd /Users/nikita/Programming/placeholder_default_project/telegram-webapp
python3 -m http.server 8080
```

### 2. Start Cloudflare Tunnel

In a separate terminal:

```bash
cloudflared tunnel --url http://localhost:8080
```

This will output a public URL like:
```
https://some-random-words.trycloudflare.com
```

### 3. Configure BotFather

1. Open **@BotFather** on Telegram
2. Send `/mybots`
3. Select your bot
4. Go to **Bot Settings** → **Menu Button** (or **Configure Mini App**)
5. Set the URL to your cloudflare tunnel URL (e.g., `https://some-random-words.trycloudflare.com`)

### 4. Test the Game

Open your bot in Telegram and click the Menu Button or Mini App to launch the game.

## Notes

- The cloudflare tunnel URL changes each time you restart the tunnel
- You'll need to update BotFather with the new URL if you restart the tunnel
- Keep both the HTTP server and cloudflared running while testing
- The game saves progress to localStorage in the browser

## Bot Token

Store your bot token securely (e.g., in a local `.env` file or password manager).

Never commit bot tokens to public repositories.
