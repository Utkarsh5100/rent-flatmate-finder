# 🏠 Rent & Flatmate Finder

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Express.js](https://img.shields.io/badge/Express.js-Latest-90C53F?style=for-the-badge&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **AI-powered platform** where property owners list rooms, tenants create profiles, and an intelligent compatibility engine scores and ranks flatmate matches — with real-time chat and email notifications.

[🚀 Quick Start](#-local-setup) • [📚 Documentation](#-api-documentation) • [🗺️ Roadmap](#%EF%B8%8F-project-roadmap)

</div>

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>🤖 AI-Powered Matching</h3>
      <p>Intelligent LLM-based compatibility scoring using OpenAI GPT-4o or Anthropic Claude</p>
    </td>
    <td width="50%">
      <h3>💬 Real-time Chat</h3>
      <p>Instant messaging with WebSocket integration via Socket.IO</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📧 Smart Notifications</h3>
      <p>Email alerts via Resend or Nodemailer for match events</p>
    </td>
    <td width="50%">
      <h3>🔐 Secure Authentication</h3>
      <p>JWT-based auth with access/refresh token rotation</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📱 Responsive Design</h3>
      <p>Mobile-first UI with Tailwind CSS v4 and shadcn/ui</p>
    </td>
    <td width="50%">
      <h3>🐳 Docker Ready</h3>
      <p>One-command deployment with docker-compose</p>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                                   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │           Next.js 14 (App Router) + TypeScript                   │  │
│  │           Tailwind CSS v4 + shadcn/ui                             │  │
│  │           Port: 3000                                              │  │
│  └────────────┬────────────────────────────┬──────────────────────┘  │
│               │ REST API (HTTP)            │ WebSocket             │
└───────────────┼────────────────────────────┼──────────────────────────┘
                │                            │
                ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (Express.js)                         │
│                                                                         │
│  ┌──────────────────────────┐    ┌───────────────────────────────────┐ │
│  │     Express.js REST API   │    │      Socket.IO Server             │ │
│  │   (JWT Auth + Middleware) │    │    (Real-time Chat)               │ │
│  │     Port: 5000            │    │    Port: 5000                     │ │
│  └──────────┬────────────────┘    └───────────────────────────────────┘ │
│             │                                                           │
│  ┌──────────┼─────────────────────────────────────────────────────────┐ │
│  │          ▼                                                          │ │
│  │   ┌────────────┐   ┌─────────────────┐   ┌──────────────────┐    │ │
│  │   │   Prisma   │   │   LLM Engine    │   │  Email Service   │    │ │
│  │   │    ORM     │   │ (OpenAI/Claude) │   │ (Resend/SMTP)    │    │ │
│  │   └─────┬──────┘   └─────────────────┘   └──────────────────┘    │ │
│  │         │              AI Scoring           Email Notifications   │ │
│  └─────────┼──────────────────────────────────────────────────────────┘ │
│            │                                                             │
└────────────┼─────────────────────────────────────────────────────────────┘
             │
             ▼
       ┌──────────────┐
       │  PostgreSQL  │
       │   Database   │
       │  Port: 5432  │
       └──────────────┘
```

### 📊 Data Flow

1. **Frontend ↔ Backend**: REST API with JWT authentication headers
2. **Real-time Updates**: Bidirectional WebSocket via Socket.IO
3. **Data Persistence**: Prisma ORM manages PostgreSQL queries
4. **AI Matching**: LLM-powered compatibility scoring
5. **Notifications**: Automated email triggers on match events

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Real-time** | Socket.IO |
| **Authentication** | JWT (access + refresh tokens) |
| **AI Engine** | OpenAI GPT-4o / Anthropic Claude |
| **Email** | Resend / Nodemailer |
| **Logging** | Pino (JSON/pretty modes) |
| **CI/CD** | GitHub Actions |

</div>

---

## 📁 Project Structure

```
rent-flatmate-finder/
├── .github/workflows/
│   └── lint.yml                    # GitHub Actions CI pipeline
├── frontend/                       # Next.js 14 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css        # Design tokens & Tailwind v4
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── page.tsx           # Home page
│   │   ├── components/            # React components + shadcn/ui
│   │   ├── hooks/                 # Custom React hooks
│   │   └── lib/
│   │       └── utils.ts           # cn() utility & helpers
│   ├── components.json            # shadcn/ui config
│   ├── eslint.config.mjs          # ESLint rules
│   └── tsconfig.json              # TypeScript config
├── backend/                        # Express API server
│   ├── src/
│   │   ├── index.ts               # Express app bootstrap
│   │   ├── errors/                # Custom error classes
│   │   ├── lib/
│   │   │   └── logger.ts          # Pino logger
│   │   ├── middleware/            # Request & error handlers
│   │   └── routes/                # API route handlers
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── .env.example               # Environment template
│   └── tsconfig.json              # TypeScript config
├── docker-compose.yml             # Docker orchestration
├── .gitignore                     # Git ignore rules
├── .prettierrc                    # Code formatting rules
└── README.md                      # This file
```

---

## 🚀 Local Setup

### Prerequisites

<div align="center">

| Requirement | Version | Download |
|----------|---------|----------|
| **Node.js** | ≥ 20.x | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | ≥ 15.x | [postgresql.org](https://www.postgresql.org/download/) |
| **npm** | ≥ 10.x | Included with Node.js |

</div>

### Step 1️⃣ Clone the Repository

```bash
git clone https://github.com/anumodit740/rent-flatmate-finder.git
cd rent-flatmate-finder
```

### Step 2️⃣ Configure Environment

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and JWT_SECRET (min 32 chars)

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

### Step 3️⃣ Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### Step 4️⃣ Initialize Database

```bash
# From backend directory
createdb rent_flatmate_finder
npx prisma generate
npx prisma migrate dev --name init
```

### Step 5️⃣ Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

### Step 6️⃣ Verify Installation

```bash
# Frontend
open http://localhost:3000

# Backend health check
curl http://localhost:5000/api/health
# Response: {"status":"ok","timestamp":"2024-...","uptime":12.34,"environment":"development"}
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `5000` | ✓ |
| `NODE_ENV` | Environment | `development` | ✓ |
| `LOG_LEVEL` | Pino log level | `debug` | ✓ |
| `DATABASE_URL` | PostgreSQL connection | — | ✓ |
| `JWT_SECRET` | JWT signing secret (≥32 chars) | — | ✓ |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` | — |
| `LLM_PROVIDER` | AI provider (`openai` or `claude`) | `openai` | ✓ |
| `LLM_API_KEY` | LLM API key | — | ✓ |
| `LLM_MODEL` | Model name | `gpt-4o` | ✓ |
| `EMAIL_PROVIDER` | Email service (`resend` or `nodemailer`) | `resend` | ✓ |
| `EMAIL_API_KEY` | Email service API key | — | ✓ |
| `EMAIL_FROM` | Sender email | `noreply@rentfinder.com` | ✓ |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` | — |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` | ✓ |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `http://localhost:5000` | ✓ |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Rent & Flatmate Finder` | — |

---

## 📜 Available Scripts

### Root Level

```bash
npm run dev:frontend         # Start frontend dev server
npm run dev:backend          # Start backend dev server
npm run lint                 # Lint both projects
npm run format               # Format with Prettier
npm run format:check         # Check formatting (CI-safe)
```

### Frontend

```bash
npm run dev                  # Start Next.js dev (port 3000)
npm run build                # Build production bundle
npm run start                # Serve production build
npm run lint                 # Run ESLint
```

### Backend

```bash
npm run dev                  # Start Express with hot-reload
npm run build                # Compile TypeScript to dist/
npm run start                # Run production server
npm run lint                 # Run ESLint
npm run db:generate          # Generate Prisma client
npm run db:migrate           # Run migrations
npm run db:studio            # Open Prisma Studio GUI
```

---

## 🐳 Docker Deployment

Deploy the entire stack with a single command:

```bash
docker-compose up --build
```

**Services:**
- 🌐 Frontend: [http://localhost:3000](http://localhost:3000)
- 🔌 Backend API: [http://localhost:5000](http://localhost:5000)
- 🗄️ PostgreSQL: `localhost:5432`

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The repository includes automated CI at `.github/workflows/lint.yml`:

- ✅ Code quality checks (ESLint)
- ✅ PostgreSQL service integration
- ✅ Database migration verification
- ✅ Unit & API integration tests

Runs automatically on:
- Push to `main` branch
- Pull requests to `main` branch

---

## 📋 Database Schema

**9 Core Models** defined in `backend/prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| **User** | Authentication, roles (`TENANT`, `OWNER`, `ADMIN`), email |
| **TenantProfile** | Location preferences, budget range, move-in date, bio |
| **Listing** | Room details, rent, deposit, amenities, rules |
| **ListingPhoto** | Gallery images (1:N relationship with Listing) |
| **CompatibilityScore** | LLM-cached match scores (0-100) with explanations |
| **InterestRequest** | Match handshake (`PENDING`, `ACCEPTED`, `DECLINED`) |
| **Conversation** | Chat thread (1:1 with accepted Interest) |
| **ChatMessage** | Individual messages with read receipts |
| **Notification** | User notification stack with event metadata |

---

## 🔌 API Documentation

All endpoints return unified JSON envelopes:

```json
{
  "status": "success|error",
  "data": { /* response payload */ },
  "message": "error description (if error)"
}
```

### 🔐 Authentication Endpoints

- `POST /api/auth/register` — Create TENANT or OWNER account
- `POST /api/auth/login` — Sign in, receive JWT tokens
- `POST /api/auth/refresh` — Rotate access & refresh tokens
- `POST /api/auth/logout` — Invalidate sessions
- `GET /api/auth/me` — Current user profile

### 🏠 Listing Endpoints

- `GET /api/listings` — Browse listings (filters: location, rent, roomType, furnishing)
- `POST /api/listings` — Create listing (multipart, ≤5 photos)
- `PUT /api/listings/:id` — Update listing details
- `PATCH /api/listings/:id/status` — Toggle ACTIVE/FILLED status
- `DELETE /api/listings/:id` — Delete listing

### 💬 Match & Chat Endpoints

- `POST /api/interests` — Express interest in a listing
- `GET /api/conversations` — List active chats
- `POST /api/conversations/:id/messages` — Send chat message
- `PATCH /api/conversations/:id/messages/:msgId/read` — Mark as read

---

## 🤖 AI Compatibility Scoring

### Scoring Algorithm

The backend uses LLM APIs to compute tenant-room compatibility:

**Prompt Template:**
```text
Given this room listing: {listing_json} and this tenant profile: {tenant_json},
compute a compatibility score from 0 to 100 based on:
- Budget match (rent vs. budget range)
- Location preference alignment
- Move-in date compatibility
- Lifestyle fit
Return: {"score": <0-100>, "explanation": "..."}
```

### Example Scoring

**Input:**
- **Listing**: Single room in Mumbai, ₹15,000/month, furnished, WiFi, no smoking
- **Tenant**: Budget ₹10-20k, Mumbai preferred, moving Aug 2025, Software Engineer

**Output:**
```json
{
  "score": 95,
  "explanation": "Perfect location match. Rent within budget. Availability aligns perfectly."
}
```

---

## 🗺️ Project Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 0** | ✅ Complete | Monorepo setup, ESLint, Prettier, TypeScript strict |
| **Phase 1** | ✅ Complete | Database schema, indexing, seed scripts |
| **Phase 2** | ✅ Complete | JWT auth, token rotation, UI |
| **Phase 3** | ✅ Complete | Listing uploads, photo storage, filters |
| **Phase 4** | ✅ Complete | AI matching, scoring, UI badges |
| **Phase 5** | ✅ Complete | Match handshakes, email notifications |
| **Phase 6** | ✅ Complete | Socket.IO chat, real-time sync |
| **Phase 7** | ✅ Complete | Account management, statistics |

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 💬 Support

Need help? Open an [Issue](https://github.com/anumodit740/rent-flatmate-finder/issues) or start a [Discussion](https://github.com/anumodit740/rent-flatmate-finder/discussions).

---

<div align="center">

**Made with ❤️ by [Utkarsh](https://github.com/Utkarsh5100)**

⭐ Star this repo if you found it helpful!

</div>
