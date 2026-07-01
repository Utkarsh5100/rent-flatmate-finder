# Railway Deployment Guide

This guide describes how to deploy the **Rent & Flatmate Finder** platform (Frontend, Backend, and PostgreSQL database) to **Railway** under a single unified project.

---

## 🏗️ Architecture & Service Layout

We deploy three separate services inside one Railway project:
1. **Postgres Database**: Provisioned via Railway's managed Database Plugin.
2. **Backend API Service**: Node.js web service running from `/backend` directory.
3. **Frontend Next.js Service**: Next.js web service running from `/frontend` directory.

---

## 🔐 Environment Variables Reference

Configure these environment variables on the respective services within your Railway dashboard.

### 1. Postgres Service
No manual variables are needed. Railway auto-generates the database credentials and connection parameters upon database provision.

### 2. Backend Service (`backend`)
| Variable | Value / Reference | Purpose |
|----------|-------------------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Service link reference pointing to the Postgres service |
| `JWT_SECRET` | *generate a random 32+ character string* | Token signing key |
| `JWT_REFRESH_SECRET` | *generate another random 32+ character string* | Refresh token signing key |
| `LLM_PROVIDER` | `openai` or `claude` | Matching engine LLM provider |
| `LLM_API_KEY` | *your LLM provider API Key* | API authentication |
| `LLM_MODEL` | `gpt-4o-mini` or model of choice | Model name |
| `EMAIL_PROVIDER` | `nodemailer` or `resend` | Email dispatch service |
| `EMAIL_API_KEY` | *your Resend key (if using Resend)* | Email authentication |
| `SMTP_HOST` | *SMTP server host (if using SMTP)* | SMTP connection |
| `SMTP_PORT` | *SMTP port (if using SMTP)* | SMTP port |
| `SMTP_USER` | *SMTP username* | SMTP login |
| `SMTP_PASS` | *SMTP password* | SMTP password |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Email sender address |
| `FRONTEND_URL` | `${{frontend.RAILWAY_PUBLIC_DOMAIN}}` or custom domain | Allowed CORS origin (cross-service link) |
| `PORT` | *Auto-assigned by Railway* | Express listen port |

### 3. Frontend Service (`frontend`)
| Variable | Value / Reference | Purpose |
|----------|-------------------|---------|
| `NEXT_PUBLIC_API_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api` | Public REST endpoint URL of backend |
| `NEXT_PUBLIC_SOCKET_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` | Public Socket.IO WebSocket server URL |

> [!IMPORTANT]
> Next.js bakes `NEXT_PUBLIC_*` environment variables directly into the client-side bundle **at build time**. You MUST define these variables in the Frontend Service settings **before triggering the build/deploy** so they are baked in correctly.

---

## 📋 Step-by-Step Deployment Runbook

Follow this deployment order to resolve cross-service variables correctly:

### Step 1: Create Project & Provision Database
1. Go to your **Railway Dashboard** and click **New Project** → **Deploy from GitHub**.
2. Select your repository. During the initial wizard, choose the root folder or select **Empty Project** and add things one by one.
3. Click **New** → **Database** → **Add PostgreSQL**. This provisions a managed database plugin immediately.

### Step 2: Set Up Backend Service
1. Click **New** → **GitHub Repo** → select your repository.
2. Go to the new service's **Settings** → rename the service to `backend`.
3. In **Settings** → **General** → set **Root Directory** to `/backend`.
4. Go to **Variables** and add all variables listed in the **Backend Service** table above. Ensure `DATABASE_URL` is set to the reference: `${{Postgres.DATABASE_URL}}`.
5. Trigger deploy. Railway will build using Nixpacks, apply database migrations automatically during the start stage (`npx prisma migrate deploy`), and host the API.
6. Once deployed, go to **Settings** → **Networking** → click **Generate Domain** (or set a custom domain) and copy the generated backend URL (e.g. `backend-production.up.railway.app`).

### Step 3: Set Up Frontend Service
1. Click **New** → **GitHub Repo** → select your repository.
2. Go to the service's **Settings** → rename the service to `frontend`.
3. In **Settings** → **General** → set **Root Directory** to `/frontend`.
4. Go to **Variables** and add the two variables listed in the **Frontend Service** table above, substituting the backend public domain you copied in Step 2.
5. Trigger build/deploy. Next.js will compile the static site pages.
6. Once deployed, go to **Settings** → **Networking** → click **Generate Domain** to get the public frontend URL (e.g. `frontend-production.up.railway.app`).

### Step 4: Configure CORS (CORS Handshake)
1. Go back to your **backend** service's **Variables** tab.
2. Set the `FRONTEND_URL` variable to your frontend's public URL (e.g., `https://frontend-production.up.railway.app`).
3. Redeploy the backend service to pick up the updated allowed CORS origin configuration.

---

## 🗄️ Database Seeding on Railway

To populate the Railway Postgres database with the initial platform seed data:

1. Install the Railway CLI locally:
   ```bash
   npm i -g @railway/cli
   ```
2. Authenticate the CLI with your account:
   ```bash
   railway login
   ```
3. Link your local project directory to your Railway project:
   ```bash
   railway link
   ```
4. Run the seed script against the remote database:
   ```bash
   cd backend
   railway run npm run db:seed
   ```
This executes the prisma seed script directly against your Railway database connection.

---

## 💸 Usage-Based Free Tier Note

Railway operates on a **usage-based execution model** rather than Render's sleep-based model.
- **No Sleep Latency**: Services stay active and will not enter sleep mode due to inactivity. This avoids the "cold start" latency (typically 30–50s on Render's free tier) when a user visits the site.
- **Resource Monitoring**: You receive a monthly limit of execution credits. Monitor your CPU and RAM usage in the project's **Usage** tab to prevent suspension if credits are exhausted before the month resets.
