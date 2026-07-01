# 🏠 Rent & Flatmate Finder

> AI-powered platform where property owners list rooms, tenants create profiles, and an intelligent compatibility engine scores and ranks flatmate matches — with real-time chat and email notifications.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [CI/CD](#cicd)
- [Development Roadmap](#development-roadmap)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Next.js 14 (App Router) + TypeScript            │  │
│  │           Tailwind CSS + shadcn/ui                         │  │
│  │           Port: 3000                                       │  │
│  └────────────┬────────────────────────────┬─────────────────┘  │
│               │ REST API (HTTP)            │ WebSocket           │
└───────────────┼────────────────────────────┼────────────────────┘
                │                            │
                ▼                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                                │
│                                                                   │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐ │
│  │   Express.js API     │    │       Socket.IO Server           │ │
│  │   (REST + JWT Auth)  │    │       (Real-time Chat)           │ │
│  │   Port: 5000         │    │       Port: 5000                 │ │
│  └─────────┬────────────┘    └──────────────────────────────────┘ │
│            │                                                      │
│  ┌─────────┼──────────────────────────────────────────────────┐  │
│  │         ▼                                                   │  │
│  │   ┌──────────┐    ┌──────────────┐    ┌────────────────┐   │  │
│  │   │  Prisma   │    │  LLM API     │    │  Email Service │   │  │
│  │   │  ORM      │    │  (OpenAI /   │    │  (Resend /     │   │  │
│  │   │          │    │   Claude)     │    │   Nodemailer)  │   │  │
│  │   └────┬─────┘    └──────────────┘    └────────────────┘   │  │
│  │        │          AI Compatibility           Email           │  │
│  │        │          Scoring Engine         Notifications       │  │
│  └────────┼────────────────────────────────────────────────────┘  │
│           │                                                       │
└───────────┼───────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────┐
│    PostgreSQL        │
│    Database          │
│    Port: 5432        │
└─────────────────────┘
```

### Data Flow

1. **Frontend → Backend**: REST API calls over HTTP with JWT auth headers
2. **Real-time Chat**: Bidirectional WebSocket via Socket.IO
3. **Backend → Database**: Prisma ORM manages all PostgreSQL queries
4. **AI Matching**: Backend calls LLM API (OpenAI or Claude, configured via `.env`) to score tenant-room compatibility
5. **Notifications**: Backend triggers email via Resend or Nodemailer on match events

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Real-time** | Socket.IO |
| **Auth** | JWT (access + refresh tokens) |
| **AI Engine** | OpenAI GPT-4o / Anthropic Claude (switchable via env) |
| **Email** | Resend / Nodemailer (switchable via env) |
| **Logging** | Pino (JSON in prod, pretty in dev) |
| **CI** | GitHub Actions (lint on push) |

---

## 📁 Project Structure

```
Rent_Flatmate_Finder/
├── .github/
│   └── workflows/
│       └── lint.yml              # CI: lint on push/PR
├── frontend/                     # Next.js application
│   ├── src/
│   │   ├── app/                  # App Router pages & layouts
│   │   │   ├── globals.css       # Design system (Tailwind v4 @theme tokens)
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Home page
│   │   ├── components/           # React components (shadcn/ui lives here)
│   │   ├── lib/
│   │   │   └── utils.ts          # cn() utility (clsx + tailwind-merge)
│   │   └── hooks/                # Custom React hooks
│   ├── components.json           # shadcn/ui configuration
│   ├── .env.example              # Frontend env template
│   ├── eslint.config.mjs         # ESLint (next/core-web-vitals + TS)
│   ├── tsconfig.json             # TypeScript strict config
│   └── package.json
├── backend/                      # Express API server
│   ├── src/
│   │   ├── index.ts              # Entry point (Express app bootstrap)
│   │   ├── errors/
│   │   │   └── index.ts          # Custom error classes (AppError, NotFound, etc.)
│   │   ├── lib/
│   │   │   └── logger.ts         # Pino logger (JSON prod / pretty dev)
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts   # Centralized error-handling middleware
│   │   │   └── requestLogger.ts  # HTTP request logging (pino-http)
│   │   └── routes/
│   │       ├── index.ts          # Route aggregator
│   │       └── health.ts         # GET /api/health
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (PostgreSQL)
│   ├── .env.example              # Backend env template
│   ├── .eslintrc.json            # ESLint (TypeScript-ESLint)
│   ├── tsconfig.json             # TypeScript strict config
│   └── package.json
├── .gitignore                    # Git ignore rules
├── .prettierrc                   # Shared Prettier config
├── package.json                  # Root convenience scripts
└── README.md                     # This file
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** ≥ 20.x ([download](https://nodejs.org/))
- **PostgreSQL** ≥ 15.x ([download](https://www.postgresql.org/download/))
- **npm** ≥ 10.x (ships with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/rent-flatmate-finder.git
cd rent-flatmate-finder
```

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum set DATABASE_URL and JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Install dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 4. Set up the database

```bash
# From the backend directory
# Create the database (if it doesn't exist)
createdb rent_flatmate_finder

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

### 5. Start development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 6. Verify

- **Frontend**: Open [http://localhost:3000](http://localhost:3000)
- **Backend health**: `curl http://localhost:5000/api/health`
  ```json
  { "status": "ok", "timestamp": "2024-...", "uptime": 12.34, "environment": "development" }
  ```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Pino log level | `debug` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `LLM_PROVIDER` | AI provider (`openai` or `claude`) | `openai` |
| `LLM_API_KEY` | LLM API key | — |
| `LLM_MODEL` | LLM model name | `gpt-4o` |
| `EMAIL_PROVIDER` | Email service (`resend` or `nodemailer`) | `resend` |
| `EMAIL_API_KEY` | Email service API key | — |
| `EMAIL_FROM` | Sender email address | `noreply@rentfinder.com` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `http://localhost:5000` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Rent & Flatmate Finder` |

---

## 📜 Available Scripts

### Root level

| Script | Description |
|--------|-------------|
| `npm run dev:frontend` | Start frontend dev server |
| `npm run dev:backend` | Start backend dev server |
| `npm run lint` | Run linters for both projects |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting (CI-safe) |

### Frontend (`cd frontend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Build production bundle |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

### Backend (`cd backend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## 🔄 CI/CD

### GitHub Actions

- **Lint workflow** (`.github/workflows/lint.yml`): Runs on every push/PR to `main` and `develop`
  - Lints frontend (ESLint + Next.js rules)
  - Lints backend (TypeScript-ESLint)
  - Tests will be added in the next phase

---

## 🗺️ Development Roadmap

### ✅ Phase 0 — Foundation (Current)
- [x] Project structure (frontend + backend)
- [x] TypeScript strict mode, ESLint, Prettier
- [x] Tailwind v4 design system with custom tokens
- [x] shadcn/ui configuration
- [x] Express skeleton with error handling, logging, health endpoint
- [x] Prisma + PostgreSQL connection
- [x] Environment variable templates
- [x] GitHub Actions lint CI

### 🔜 Phase 1 — Core Features
- [ ] Prisma schema (User, Listing, Room, UserPreferences)
- [ ] JWT authentication (register, login, refresh, logout)
- [ ] User profile CRUD
- [ ] Room listing CRUD with image uploads

### 📋 Phase 2 — AI Matching & Chat
- [ ] AI compatibility scoring engine (OpenAI / Claude)
- [ ] Match ranking algorithm
- [ ] Socket.IO real-time chat
- [ ] Chat message persistence

### 📋 Phase 3 — Notifications & Polish
- [ ] Email notifications (Resend / Nodemailer)
- [ ] Search & filter UI
- [ ] Dashboard views (owner / tenant)
- [ ] Responsive mobile layouts

### 📋 Phase 4 — Production
- [ ] Unit & integration tests
- [ ] Rate limiting & input sanitization
- [ ] Docker setup
- [ ] Deployment (Vercel + Railway / Render)
