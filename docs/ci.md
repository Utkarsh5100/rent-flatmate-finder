# Continuous Integration (CI) Guide

The platform uses GitHub Actions to run automated checks (linting, type-checking, database migrations, and test suites) on every push and pull request to the `main` branch.

## CI Workflow

The workflow is defined in `.github/workflows/ci.yml` and consists of two main jobs:

### 1. Backend CI (`backend-test`)
- Runs on `ubuntu-latest` with **Node.js 20**.
- Spins up a **PostgreSQL 15** service container inside the runner environment.
- Installs backend dependencies.
- Generates the Prisma client first (so type-aware linting compiles correctly).
- Runs ESLint (`npm run lint`).
- Deploys/pushes database schema to the test PostgreSQL instance (`npx prisma db push`).
- Executes the Vitest test suite (`npm run test`).

### 2. Frontend CI (`frontend-build`)
- Runs on `ubuntu-latest` with **Node.js 20** (required by Next.js 16).
- Installs frontend dependencies.
- Runs ESLint (`npm run lint`).
- Compiles the Next.js production build (`npm run build`).

---

## Environment Variables & Secrets

### In-Memory Dummies for CI
To ensure that PR validation passes securely without exposing production credentials, the CI workflow supplies mock/dummy environment variables directly in the YAML file:
- `DATABASE_URL`: Pointed to the local PostgreSQL container running inside the CI job (`postgresql://postgres:postgrespassword@localhost:5432/rent_flatmate_finder_test`).
- `JWT_SECRET`: A safe dummy signing secret.
- `NODE_ENV`: Set to `test`.
- `NEXT_PUBLIC_API_URL`: Set to a mock backend endpoint URL for compilation.

### Live API testing (Optional)
The unit and integration test suites do not require live API keys. When keys like `LLM_API_KEY` or `EMAIL_API_KEY` are missing, the test runner logs warnings and automatically falls back to:
- The deterministic local matching algorithm.
- Safe, non-blocking mocked email/SMTP transport.

If you ever wish to test live integrations in CI, you can add them to your repository's secrets (**Settings** → **Secrets and variables** → **Actions**) and reference them in your workflow YAML:
- `LLM_API_KEY`: `${{ secrets.LLM_API_KEY }}`
- `EMAIL_API_KEY`: `${{ secrets.EMAIL_API_KEY }}`
