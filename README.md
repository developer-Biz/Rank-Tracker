# Rank Tracker 2.0 (Hostinger deployment notes)

This repo contains:

- `backend/`: Express API + serves the production frontend build
- `frontend/`: Vite + React SPA

In production the backend serves `frontend/dist` and the frontend calls the API at `/api`.

## Requirements

- Node **20+** (backend `engines` is `>=20 <23`)
- npm **10+**

## Environment variables

Create environment variables on your host (or a `backend/.env` for local development).

Minimum required for production:

- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-domain.com`
- `PORT` (use the platform-provided value if set)

Notes:

- Vite reads `VITE_*` variables **at build time**. Ensure Hostinger makes these available during the build step.
- `FRONTEND_URL` must match the browser origin exactly (scheme + host) when `NODE_ENV=production`, otherwise CORS will block API calls.

## How the build works

The backend has a `postinstall` script that:

1. runs `npm ci` in `frontend/`
2. runs `npm run build` in `frontend/` (creates `frontend/dist`)

So a typical production flow is:

- install backend deps → `postinstall` builds frontend → `npm start` runs `node server.js`

If your host has its own separate frontend build step, set `SKIP_FRONTEND_POSTINSTALL=1` (or `SKIP_FRONTEND_BUILD=1`) for the backend install to avoid duplicate work, and run the frontend build in your pipeline instead.

## Hostinger (Node app) checklist

- Set runtime to **Node 20**
- Configure all env vars listed above
- Start command: `npm start`
- App root: `backend/` (recommended)

If Hostinger expects a single root project, you can still deploy from the repo root, but make sure the start command runs the backend (e.g. `npm --prefix backend start`) and that the install step runs `npm --prefix backend ci`.

