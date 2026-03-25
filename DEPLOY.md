# Deployment checklist

## Architecture

- **Same origin (recommended):** One Node process serves `GET /api/*` and the static files from `client/build`. Set `REACT_APP_API_URL` **unset** at build time.
- **Split origin:** Host `client/build` on a static host and the server elsewhere. Build with `REACT_APP_API_URL=https://your-api-host.com` and set `CLIENT_ORIGIN` on the server to your static app URL.

## Environment (server)

Copy `server/.env.example` → `server/.env` and set:

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Atlas or self-hosted |
| `APIFY_TOKEN` | Yes | For scrapes |
| `APIFY_TIKTOK_ACTOR_ID` | Yes | |
| `APIFY_INSTAGRAM_ACTOR_ID` | Yes | |
| `PORT` | No | Defaults to `5000`; many hosts set this |
| `NODE_ENV` | No | `production` in prod |
| `CLIENT_ORIGIN` | Only split deploy | e.g. `https://app.example.com` for CORS |

## Build and run (same origin)

```bash
cd client && npm ci && npm run build
cd ../server && npm ci --omit=dev && NODE_ENV=production node server.js
```

Ensure `server/../client/build/index.html` exists after the client build. If the build folder is missing, the server still runs **API-only** and logs a warning.

## Health

`GET /api/health` should return `{ "status": "ok", ... }`.

## SPA routing

Direct visits to `/videos`, `/analytics`, etc. are served `index.html` when the production static block is active (build present).

## Cron

The scrape cron starts with the server; keep the process running (systemd, PM2, or platform “always on”).
