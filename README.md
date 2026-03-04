# Diabetes Insights MVP

MVP app that ingests Glooko CGM CSV data daily, stores readings in PostgreSQL, computes daily insights (TIR, variability, streak), sends a Telegram digest, and shows a dashboard.

## Tech Stack

- Next.js 15 + TypeScript
- Prisma + PostgreSQL
- `shadcn/ui`-style component setup
- Playwright (Glooko login + CSV export automation)
- Node cron (`23:59` analysis + `09:00` Telegram, Europe/Berlin)
- Vitest for core TDD tests

## Setup

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env
```

3. Fill `.env`

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/diabetes"
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
GLOOKO_EMAIL="..."
GLOOKO_PASSWORD="..."
OPENAI_API_KEY="..."
# Optional model override
# OPENAI_MODEL="gpt-4.1-mini"
# Optional OpenAI-compatible provider (e.g. Groq)
# GROQ_API_KEY="..."
# GROQ_MODEL="llama-3.3-70b-versatile"
# GROQ_BASE_URL="https://api.groq.com/openai/v1"
# Optional overrides
# GLOOKO_LOGIN_URL="https://my.glooko.com/users/sign_in"
# GLOOKO_EXPORT_URL="https://my.glooko.com/reports"
# GLOOKO_HEADLESS="true"
```

4. Install Playwright browser

```bash
npx playwright install chromium
```

5. Generate Prisma client and migrate DB

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

6. (Optional) Seed demo data

```bash
npm run db:seed
```

## Run

- Web app: `npm run dev`
- Daily scheduler process: `npm run job:scheduler`
- Trigger full pipeline now (analysis + immediate message): `npm run job:run-now`
- Trigger nightly analysis only: `npm run job:analysis-now`
- Trigger morning Telegram only (sends previous day): `npm run job:morning-now`

## TDD Coverage (current)

- CSV parsing + normalization
- Daily insight calculation (TIR, SD, streak, recommendation fallback)

Run tests:

```bash
npm test
```

## Notes

- Glooko UI can change; selectors are coded with fallbacks in `src/lib/glookoExport.ts`.
- If Glooko account has 2FA/captcha, the fully automated login may require additional session handling.
- Scheduler expects process uptime. For production, run under `systemd`, PM2, or Docker restart policy.
- Q&A uses AI when `GROQ_API_KEY` or `OPENAI_API_KEY` is set. Without either key, the app falls back to source-based local answer logic.
