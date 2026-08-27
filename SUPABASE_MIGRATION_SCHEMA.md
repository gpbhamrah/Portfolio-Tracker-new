# Supabase Migration Schema & Data Architecture Reference

This document captures the complete data models, entity relationships, fields, data types, constraints, and Row Level Security (RLS) design for migrating the Portfolio Tracker from the legacy Prisma/PostgreSQL/Custom Auth system to **Supabase**.

---

## 1. Authentication Architecture Transition

| Feature | Legacy System (Removed) | Supabase Target (Upcoming) |
| :--- | :--- | :--- |
| **Identity Provider** | Custom `users` table with `bcrypt` hash & `jsonwebtoken` | **Supabase Auth** (`auth.users`) |
| **Password Storage** | Application database (`passwordHash` column) | Managed securely in Supabase Auth (Argon2 / bcrypt) |
| **Session Handling** | Custom HTTP-only cookies / Custom JWT Bearer tokens | Supabase JWT & Refresh Token session manager |
| **Email Verification** | Custom boolean flag | Built-in Supabase Auth email confirmation flows |
| **Password Reset** | Placeholder endpoint | Built-in Supabase Auth `resetPasswordForEmail` |
| **Multi-Tenancy** | Custom IDOR checks in application middleware | **Supabase Row Level Security (RLS)** at PostgreSQL level |

---

## 2. Supabase PostgreSQL Schema Specification

### 2.1 Profiles / User Settings Table (`public.profiles` / `public.user_settings`)
Maps directly to Supabase authenticated user (`auth.users.id`).

```sql
-- Profiles / User Settings linked directly to Supabase Auth User
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    theme VARCHAR(20) DEFAULT 'system',
    default_portfolio_id UUID,
    email_notifications BOOLEAN DEFAULT true,
    telegram_notifications BOOLEAN DEFAULT false,
    whatsapp_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_settings_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage own settings"
ON public.user_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 2.2 Portfolios Table (`public.portfolios`)
Represents an investor's segregated investment portfolio (e.g., Core Growth, Swing/Momentum, Long Term Compounders).

```sql
CREATE TABLE public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_currency VARCHAR(10) DEFAULT 'INR',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own portfolios"
ON public.portfolios FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 2.3 Instruments Master Table (`public.instruments`)
Central catalog of stocks, ETFs, mutual funds, and market indices (shared read-only for users, updated by market feed).

```sql
CREATE TYPE public.instrument_type AS ENUM ('STOCK', 'ETF', 'INDEX', 'MUTUAL_FUND', 'OTHER');

CREATE TABLE public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(50) NOT NULL UNIQUE,
    exchange VARCHAR(20) DEFAULT 'NSE',
    isin VARCHAR(30),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    sector VARCHAR(100) DEFAULT 'General',
    industry VARCHAR(100),
    instrument_type public.instrument_type DEFAULT 'STOCK',
    currency VARCHAR(10) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT true,
    last_price DOUBLE PRECISION,
    previous_close DOUBLE PRECISION,
    change DOUBLE PRECISION,
    change_percent DOUBLE PRECISION,
    day_high DOUBLE PRECISION,
    day_low DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    high_52 DOUBLE PRECISION,
    low_52 DOUBLE PRECISION,
    ema_20 DOUBLE PRECISION,
    ema_50 DOUBLE PRECISION,
    ema_100 DOUBLE PRECISION,
    ema_200 DOUBLE PRECISION,
    rsi_14 DOUBLE PRECISION,
    data_status VARCHAR(50) DEFAULT 'fresh',
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_instruments_symbol ON public.instruments(symbol);
CREATE INDEX idx_instruments_sector ON public.instruments(sector);
CREATE INDEX idx_instruments_exchange ON public.instruments(exchange);

ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read-only access for instrument master"
ON public.instruments FOR SELECT
TO authenticated, anon
USING (true);
```

---

### 2.4 Transactions Table (`public.transactions`)
Execution ledger for all buy/sell/corporate action entries.

```sql
CREATE TYPE public.transaction_type AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'BONUS', 'SPLIT', 'RIGHTS', 'DEPOSIT', 'WITHDRAWAL');

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    transaction_type public.transaction_type DEFAULT 'BUY',
    quantity DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    brokerage DOUBLE PRECISION DEFAULT 0,
    taxes DOUBLE PRECISION DEFAULT 0,
    other_charges DOUBLE PRECISION DEFAULT 0,
    transaction_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX idx_transactions_instrument_id ON public.transactions(instrument_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only manage their own transactions"
ON public.transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 2.5 Aggregated Holdings Table (`public.holdings`)
Materialized or calculated state of current open positions.

```sql
CREATE TABLE public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    quantity DOUBLE PRECISION NOT NULL,
    average_buy_price DOUBLE PRECISION NOT NULL,
    total_invested DOUBLE PRECISION NOT NULL,
    first_buy_date TIMESTAMPTZ DEFAULT now(),
    last_transaction_date TIMESTAMPTZ DEFAULT now(),
    target_sell_price DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_portfolio_instrument UNIQUE (portfolio_id, instrument_id)
);

CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_holdings_portfolio_id ON public.holdings(portfolio_id);
CREATE INDEX idx_holdings_instrument_id ON public.holdings(instrument_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view and manage their own holdings"
ON public.holdings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

### 2.6 Watchlists & Watchlist Items (`public.watchlists`, `public.watchlist_items`)

```sql
CREATE TABLE public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_watchlists_user_id ON public.watchlists(user_id);
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlists" ON public.watchlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    target_entry_price DOUBLE PRECISION,
    target_sell_price DOUBLE PRECISION,
    stop_loss DOUBLE PRECISION,
    notes TEXT,
    added_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_watchlist_instrument UNIQUE (watchlist_id, instrument_id)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_instrument_id ON public.watchlist_items(instrument_id);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage items in their watchlists" ON public.watchlist_items FOR ALL
USING (EXISTS (SELECT 1 FROM public.watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid()));
```

---

### 2.7 Alerts & Notifications (`public.alerts`, `public.notifications`)

```sql
CREATE TYPE public.alert_condition AS ENUM (
    'PRICE_ABOVE', 'PRICE_BELOW', 'TARGET_REACHED', 'STOP_LOSS',
    'EMA_ABOVE', 'EMA_BELOW', 'RSI_ABOVE', 'RSI_BELOW',
    'PERCENT_CHANGE', 'VOLUME_SPIKE', 'HIGH_52_WEEK', 'LOW_52_WEEK',
    'NIFTY_ABOVE_EMA', 'NIFTY_BELOW_EMA', 'SECTOR_ALLOCATION', 'PORTFOLIO_DRAWDOWN'
);

CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
    condition_type public.alert_condition NOT NULL,
    condition_value DOUBLE PRECISION NOT NULL,
    secondary_value DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    cooldown_minutes INT DEFAULT 60,
    notification_channels VARCHAR(100) DEFAULT 'in_app,email',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_active ON public.alerts(is_active);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'ALERT',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

### 2.8 Portfolio Snapshots (`public.portfolio_snapshots`)

```sql
CREATE TABLE public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_value DOUBLE PRECISION NOT NULL,
    invested_value DOUBLE PRECISION NOT NULL,
    realized_pnl DOUBLE PRECISION DEFAULT 0,
    unrealized_pnl DOUBLE PRECISION DEFAULT 0,
    cash DOUBLE PRECISION DEFAULT 0,
    daily_return DOUBLE PRECISION DEFAULT 0,
    benchmark_value DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_portfolio_snapshot_date UNIQUE (portfolio_id, date)
);

CREATE INDEX idx_portfolio_snapshots_portfolio_id ON public.portfolio_snapshots(portfolio_id);
CREATE INDEX idx_portfolio_snapshots_date ON public.portfolio_snapshots(date);
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access snapshots of own portfolios" ON public.portfolio_snapshots FOR ALL
USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_id AND p.user_id = auth.uid()));
```

---

## 3. Business Calculations Preserved

1. **Portfolio Valuation & P&L Engine**:
   - Current Value: $\sum (\text{Holding Quantity} \times \text{Current Market Price})$
   - Invested Capital: $\sum (\text{Holding Quantity} \times \text{Average Buy Price})$
   - Unrealized P&L: $\text{Current Value} - \text{Invested Capital}$
   - Unrealized Return %: $\frac{\text{Unrealized P&L}}{\text{Invested Capital}} \times 100$
   - Realized P&L: FIFO matching on SELL transactions.
2. **Technicals & Analytics**:
   - EMA calculations (20, 50, 100, 200 periods)
   - RSI 14 (Wilder's Smoothing)
   - MACD (12, 26, 9)
   - Sector Allocation distribution
   - Alpha, Beta, Sharpe Ratio against NIFTY 50 benchmark
3. **Broker Import CSV Parser**:
   - Zerodha / Groww / Angel One transaction format ingestion
