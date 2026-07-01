# Render Deployment Guide

This project is configured for Render Blueprint deployment through `render.yaml` at the repository root.

## Architecture

Render provisions three resources:

- `rent-flatmate-finder-backend`: Node.js/Express API and Socket.IO service from `backend`
- `rent-flatmate-finder-frontend`: Next.js web service from `frontend`
- `rent-flatmate-finder-db`: managed Render PostgreSQL database

## One-Click Blueprint Deploy

1. Push the latest `main` branch to GitHub.
2. Open Render Dashboard.
3. Click `New` -> `Blueprint`.
4. Select `https://github.com/anumodit740/rent-flatmate-finder`.
5. Render detects `render.yaml`.
6. Enter the prompted secret values:
   - `EMAIL_PROVIDER`
   - `EMAIL_API_KEY`
   - `EMAIL_FROM`
7. Click `Apply`.

Render generates `JWT_SECRET` and `JWT_REFRESH_SECRET`, creates Postgres, wires `DATABASE_URL`, and connects the frontend/backend URLs automatically.

## Backend Service

Root directory:

```text
backend
```

Build command:

```bash
npm ci && npx prisma generate && npm run build
```

Start command:

```bash
npm start
```

The backend `start` script runs:

```bash
npx prisma migrate deploy && node dist/index.js
```

Required variables:

```text
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
EMAIL_PROVIDER
EMAIL_API_KEY
EMAIL_FROM
NODE_ENV
LLM_PROVIDER
LLM_MODEL
```

`LLM_API_KEY` is optional. If omitted, the app uses the fallback compatibility scorer.

## Frontend Service

Root directory:

```text
frontend
```

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm start -- -H 0.0.0.0 -p $PORT
```

Required variables:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SOCKET_URL
```

Render sets both to the backend service's public URL. The frontend normalizes the REST API URL to `/api`.

## Redeploy

With auto-deploy enabled, push to `main`:

```bash
git push origin main
```

Manual redeploy:

1. Open the Render service.
2. Click `Manual Deploy`.
3. Select `Deploy latest commit`.

## Health Check

Backend health endpoint:

```text
https://<backend>.onrender.com/api/health
```

Expected healthy response includes:

```json
{
  "status": "ok",
  "database": {
    "status": "connected"
  }
}
```
