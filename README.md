# Full-Stack Multi-Tenant Indian Stock Portfolio Tracker 📈

A production-grade, multi-user portfolio tracker and risk analytics engine designed for Indian (NSE/BSE) and global equity investors.

---

## 🚀 Key Features

- **⚡ Lightning-Fast Parallel CMP Sync (<400ms)**: Real-time quote synchronization via server-side cached requests with rate limiting and deduplication.
- **🔐 Multi-User Authentication & IDOR Protection**: Secure JWT auth, bcrypt password hashing, account settings, password updates, and role-based permissions (`USER` / `ADMIN`).
- **🗄️ Relational Cloud Database**: Persistent PostgreSQL database schema via Prisma ORM for users, portfolios, transactions, holdings, and watchlists.
- **📂 Multi-Portfolio Management**: Create and switch between multiple portfolios (e.g. Core Wealth, Momentum Swing, Mutual Funds).
- **📥 Broker Import & Local Storage Migration**: 1-click migration of browser local storage data to the database, plus CSV parsers for Zerodha, Groww, and Upstox tradebooks.
- **📊 Quantitative & Tax Engine**:
  - Exact FIFO transaction lot matching for true average buy price and realized gains.
  - Indian Capital Gains Classification: STCG (<365 days @ 20%) vs LTCG (≥365 days @ 12.5% above ₹1.25L exemption).
  - Annualized XIRR cash-flow calculation (Newton-Raphson method) and CAGR metrics.
  - 20 EMA, 50 EMA, 200 EMA and 14-period RSI calculations.
- **🛡️ Platform Admin Console**: View system-wide metrics, telemetry logs, and manage user accounts.

---

## 🛠️ Environment Variables Setup

Create a `.env` file in the project root:

```env
# Database Connection (Neon, Supabase, Vercel Postgres, or Cloud SQL)
DATABASE_URL="postgresql://username:password@ep-host.region.aws.neon.tech/neondb?sslmode=require"

# JWT Secret for Session Tokens (Must be a long random string in production)
JWT_SECRET="your-256-bit-jwt-secret-key-change-in-production"

# Optional Port Override (Defaults to 3000)
PORT=3000
```

---

## 🗄️ Database Setup & Prisma Migrations

This project uses Prisma with PostgreSQL. You can use any managed Postgres provider:
- [Neon](https://neon.tech) (Serverless Postgres, free tier available)
- [Supabase](https://supabase.com) (Postgres database with pooling)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

### 1. Initialize Prisma Migrations

```bash
# Push schema directly to your PostgreSQL database
npx prisma db push

# Generate the TypeScript Prisma Client
npx prisma generate

# (Optional) Open Prisma Studio UI to inspect your database tables
npx prisma studio
```

---

## 🏃 Local Development

```bash
# Install dependencies
npm install

# Run full-stack dev server (Express Backend + Vite Frontend)
npm run dev

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 🌐 Deploy to Vercel or Cloud Run

### Option A: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: multi-user portfolio tracker"
   git push origin main
   ```
2. Visit [vercel.com/new](https://vercel.com/new) and import your repository.
3. Add the `DATABASE_URL` and `JWT_SECRET` in **Project Settings > Environment Variables**.
4. Deploy!

### Option B: Deploy with Docker / Cloud Run

```bash
# Build production bundle
npm run build

# Run the compiled self-contained bundle
node dist/server.cjs
```

---

## 🔒 Security & Architecture Overview

1. **Strict User Scoping (IDOR-safe)**: All database queries and CRUD operations filter on `where: { userId: req.user.userId }` or verify portfolio ownership via `verifyPortfolioOwnership` middleware.
2. **Server-Side Quote Cache**: Centralized quote cache prevents hitting external market API rate limits while maintaining <400ms latency for batch quote queries.
3. **Password Security**: Passwords are salted and hashed with `bcryptjs` (salt rounds: 10). Session tokens expire in 7 days and contain minimal user identity claims.
