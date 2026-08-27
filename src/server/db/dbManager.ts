// Clean Data Access & Domain Model Layer (Prepared for Supabase)

export interface DbUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  emailVerified: boolean;
  role: 'USER' | 'ADMIN';
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbUserSettings {
  id: string;
  userId: string;
  currency: string;
  timezone: string;
  theme: string;
  defaultPortfolioId?: string | null;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  whatsappNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPortfolio {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  baseCurrency: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbInstrument {
  id: string;
  symbol: string;
  exchange: string;
  isin?: string | null;
  name: string;
  companyName?: string | null;
  sector: string;
  industry?: string | null;
  instrumentType: 'STOCK' | 'ETF' | 'INDEX' | 'MUTUAL_FUND' | 'OTHER';
  currency: string;
  isActive: boolean;
  lastPrice?: number | null;
  previousClose?: number | null;
  change?: number | null;
  changePercent?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  volume?: number | null;
  high52?: number | null;
  low52?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  ema100?: number | null;
  ema200?: number | null;
  rsi14?: number | null;
  dataStatus: string;
  lastFetchedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbTransaction {
  id: string;
  userId: string;
  portfolioId: string;
  instrumentId: string;
  transactionType: 'BUY' | 'SELL' | 'DIVIDEND' | 'BONUS' | 'SPLIT' | 'RIGHTS' | 'DEPOSIT' | 'WITHDRAWAL';
  quantity: number;
  price: number;
  brokerage: number;
  taxes: number;
  otherCharges: number;
  transactionDate: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbHolding {
  id: string;
  userId: string;
  portfolioId: string;
  instrumentId: string;
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  firstBuyDate: Date;
  lastTransactionDate: Date;
  targetSellPrice?: number | null;
  stopLoss?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbWatchlist {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbWatchlistItem {
  id: string;
  watchlistId: string;
  instrumentId: string;
  targetEntryPrice?: number | null;
  targetSellPrice?: number | null;
  stopLoss?: number | null;
  notes?: string | null;
  addedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbAlert {
  id: string;
  userId: string;
  portfolioId?: string | null;
  instrumentId?: string | null;
  conditionType: string;
  conditionValue: number;
  secondaryValue?: number | null;
  isActive: boolean;
  triggeredAt?: Date | null;
  cooldownMinutes: number;
  notificationChannels: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbNotification {
  id: string;
  userId: string;
  alertId?: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sentAt: Date;
  createdAt: Date;
}

export interface DbPortfolioSnapshot {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: number;
  investedValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  cash: number;
  dailyReturn: number;
  benchmarkValue?: number | null;
  createdAt: Date;
}

export interface DbAuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resource: string;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

/**
 * Universal Database Manager
 * Maintains clean domain models and in-memory operational state
 * fully decoupled from old Prisma/Neon and ready for Supabase client integration.
 */
class DatabaseManager {
  // Operational repositories
  public users: Map<string, DbUser> = new Map();
  public userSettings: Map<string, DbUserSettings> = new Map();
  public portfolios: Map<string, DbPortfolio> = new Map();
  public instruments: Map<string, DbInstrument> = new Map();
  public transactions: Map<string, DbTransaction> = new Map();
  public holdings: Map<string, DbHolding> = new Map();
  public watchlists: Map<string, DbWatchlist> = new Map();
  public watchlistItems: Map<string, DbWatchlistItem> = new Map();
  public alerts: Map<string, DbAlert> = new Map();
  public notifications: Map<string, DbNotification> = new Map();
  public snapshots: Map<string, DbPortfolioSnapshot> = new Map();
  public auditLogs: DbAuditLog[] = [];

  constructor() {
    this.initDefaultSeed();
  }

  public async initialize(): Promise<void> {
    // Ready for Supabase client initialization in upcoming phase
    return Promise.resolve();
  }

  public isConnected(): boolean {
    return true;
  }

  // --- USER REPOSITORY METHODS ---

  public async findUserById(id: string): Promise<DbUser | null> {
    return this.users.get(id) || null;
  }

  public async findUserByEmail(email: string): Promise<DbUser | null> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return u;
      }
    }
    return null;
  }

  public async createUser(user: DbUser, initialSettings?: Partial<DbUserSettings>): Promise<DbUser> {
    this.users.set(user.id, user);

    const settings: DbUserSettings = {
      id: `settings-${user.id}`,
      userId: user.id,
      currency: initialSettings?.currency || 'INR',
      timezone: initialSettings?.timezone || 'Asia/Kolkata',
      theme: initialSettings?.theme || 'system',
      emailNotifications: initialSettings?.emailNotifications ?? true,
      telegramNotifications: initialSettings?.telegramNotifications ?? false,
      whatsappNotifications: initialSettings?.whatsappNotifications ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userSettings.set(user.id, settings);

    return user;
  }

  public async updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
    const existing = this.users.get(id);
    if (!existing) return null;

    const updated: DbUser = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  public async deleteUser(id: string): Promise<boolean> {
    this.users.delete(id);
    this.userSettings.delete(id);

    // Cascade delete user portfolios
    for (const [pId, p] of this.portfolios.entries()) {
      if (p.userId === id) {
        this.portfolios.delete(pId);
      }
    }

    // Cascade delete transactions
    for (const [tId, t] of this.transactions.entries()) {
      if (t.userId === id) {
        this.transactions.delete(tId);
      }
    }

    // Cascade delete watchlists
    for (const [wId, w] of this.watchlists.entries()) {
      if (w.userId === id) {
        this.watchlists.delete(wId);
      }
    }

    return true;
  }

  // --- USER SETTINGS METHODS ---

  public async getUserSettings(userId: string): Promise<DbUserSettings | null> {
    return this.userSettings.get(userId) || null;
  }

  public async updateUserSettings(userId: string, updates: Partial<DbUserSettings>): Promise<DbUserSettings> {
    const existing = this.userSettings.get(userId) || {
      id: `settings-${userId}`,
      userId,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      theme: 'system',
      emailNotifications: true,
      telegramNotifications: false,
      whatsappNotifications: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated: DbUserSettings = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.userSettings.set(userId, updated);
    return updated;
  }

  // --- PORTFOLIO METHODS ---

  public async getPortfolios(userId: string): Promise<DbPortfolio[]> {
    let userPorts = Array.from(this.portfolios.values()).filter((p) => p.userId === userId);

    if (userPorts.length === 0) {
      const defaultPort: DbPortfolio = {
        id: `port-${userId}-main`,
        userId,
        name: 'Primary Portfolio',
        description: 'Main investment holding portfolio',
        baseCurrency: 'INR',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.portfolios.set(defaultPort.id, defaultPort);
      userPorts = [defaultPort];
    }

    return userPorts;
  }

  public async getPortfolioById(id: string): Promise<DbPortfolio | null> {
    return this.portfolios.get(id) || null;
  }

  public async createPortfolio(portfolio: DbPortfolio): Promise<DbPortfolio> {
    this.portfolios.set(portfolio.id, portfolio);
    return portfolio;
  }

  // --- TRANSACTION METHODS ---

  public async getTransactions(portfolioId: string, userId?: string): Promise<DbTransaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.portfolioId === portfolioId && (!userId || t.userId === userId))
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  }

  public async createTransaction(tx: DbTransaction): Promise<DbTransaction> {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // --- INSTRUMENT METHODS ---

  public async getOrUpsertInstrument(
    symbol: string,
    name?: string,
    sector?: string,
    companyName?: string
  ): Promise<DbInstrument> {
    const cleanSym = symbol.trim().toUpperCase();
    const existing =
      this.instruments.get(cleanSym) ||
      this.instruments.get(cleanSym.replace('.NS', '')) ||
      this.instruments.get(`${cleanSym}.NS`);

    if (existing) {
      return existing;
    }

    const newId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const inst: DbInstrument = {
      id: newId,
      symbol: cleanSym.endsWith('.NS') ? cleanSym : `${cleanSym}.NS`,
      exchange: 'NSE',
      name: name || cleanSym.replace('.NS', ''),
      companyName: companyName || name || cleanSym.replace('.NS', ''),
      sector: sector || 'General',
      instrumentType: 'STOCK',
      currency: 'INR',
      isActive: true,
      dataStatus: 'fresh',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instruments.set(inst.id, inst);
    this.instruments.set(inst.symbol, inst);
    this.instruments.set(cleanSym, inst);
    return inst;
  }

  // --- DEFAULT SEED FOR IN-MEMORY TESTING ---

  private initDefaultSeed() {
    const demoUserId = 'usr-demo-investor';

    // 1. User
    this.users.set(demoUserId, {
      id: demoUserId,
      email: 'demo@investingjournal.com',
      name: 'Demo Investor',
      isActive: true,
      emailVerified: true,
      role: 'ADMIN',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    });

    // 2. Settings
    this.userSettings.set(demoUserId, {
      id: 'settings-demo',
      userId: demoUserId,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      theme: 'system',
      defaultPortfolioId: 'portfolio-demo-main',
      emailNotifications: true,
      telegramNotifications: false,
      whatsappNotifications: false,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    });

    // 3. Portfolios
    this.portfolios.set('portfolio-demo-main', {
      id: 'portfolio-demo-main',
      userId: demoUserId,
      name: 'Core Growth Portfolio',
      description: 'Long-term Indian equity wealth compounders with 3-5 year horizon',
      baseCurrency: 'INR',
      isDefault: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    });

    this.portfolios.set('portfolio-demo-swing', {
      id: 'portfolio-demo-swing',
      userId: demoUserId,
      name: 'Momentum / Swing',
      description: 'Stage 2 breakout swings and short-term trend setups',
      baseCurrency: 'INR',
      isDefault: false,
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date(),
    });

    // 4. Instruments
    const defaultInstruments: DbInstrument[] = [
      {
        id: 'inst-rel',
        symbol: 'RELIANCE.NS',
        exchange: 'NSE',
        name: 'Reliance Industries Ltd.',
        companyName: 'Reliance Industries Ltd.',
        sector: 'Energy',
        industry: 'Oil & Gas Refining & Marketing',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 2985.4,
        previousClose: 2950.0,
        change: 35.4,
        changePercent: 1.2,
        dayHigh: 3005.0,
        dayLow: 2945.0,
        volume: 4500000,
        high52: 3024.9,
        low52: 2220.3,
        ema20: 2940.5,
        ema50: 2890.0,
        ema200: 2750.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'inst-tcs',
        symbol: 'TCS.NS',
        exchange: 'NSE',
        name: 'Tata Consultancy Services',
        companyName: 'Tata Consultancy Services Ltd.',
        sector: 'IT',
        industry: 'IT Consulting & Software',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 4120.5,
        previousClose: 4095.0,
        change: 25.5,
        changePercent: 0.62,
        dayHigh: 4150.0,
        dayLow: 4085.0,
        volume: 1800000,
        high52: 4254.75,
        low52: 3313.0,
        ema20: 4080.0,
        ema50: 3990.0,
        ema200: 3820.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'inst-hdfc',
        symbol: 'HDFCBANK.NS',
        exchange: 'NSE',
        name: 'HDFC Bank Ltd.',
        companyName: 'HDFC Bank Ltd.',
        sector: 'Banking',
        industry: 'Private Banks',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 1645.2,
        previousClose: 1630.0,
        change: 15.2,
        changePercent: 0.93,
        dayHigh: 1658.0,
        dayLow: 1625.0,
        volume: 8500000,
        high52: 1794.0,
        low52: 1363.55,
        ema20: 1620.0,
        ema50: 1580.0,
        ema200: 1540.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'inst-infy',
        symbol: 'INFY.NS',
        exchange: 'NSE',
        name: 'Infosys Ltd.',
        companyName: 'Infosys Ltd.',
        sector: 'IT',
        industry: 'IT Consulting & Software',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 1845.0,
        previousClose: 1820.0,
        change: 25.0,
        changePercent: 1.37,
        dayHigh: 1860.0,
        dayLow: 1815.0,
        volume: 3200000,
        high52: 1950.0,
        low52: 1358.35,
        ema20: 1810.0,
        ema50: 1760.0,
        ema200: 1590.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
    ];

    for (const inst of defaultInstruments) {
      this.instruments.set(inst.id, inst);
      this.instruments.set(inst.symbol.toUpperCase(), inst);
      this.instruments.set(inst.symbol.replace('.NS', '').toUpperCase(), inst);
    }

    // 5. Seed Transactions for Demo
    const tx1: DbTransaction = {
      id: 'tx-1',
      userId: demoUserId,
      portfolioId: 'portfolio-demo-main',
      instrumentId: 'inst-rel',
      transactionType: 'BUY',
      quantity: 25,
      price: 2450.0,
      brokerage: 20,
      taxes: 12.5,
      otherCharges: 5,
      transactionDate: new Date('2023-09-15'),
      notes: 'Initial purchase at 200 EMA support',
      createdAt: new Date('2023-09-15'),
      updatedAt: new Date('2023-09-15'),
    };
    this.transactions.set(tx1.id, tx1);

    const tx2: DbTransaction = {
      id: 'tx-2',
      userId: demoUserId,
      portfolioId: 'portfolio-demo-main',
      instrumentId: 'inst-tcs',
      transactionType: 'BUY',
      quantity: 20,
      price: 3550.0,
      brokerage: 20,
      taxes: 18,
      otherCharges: 5,
      transactionDate: new Date('2023-11-10'),
      notes: 'IT industry compounder allocation',
      createdAt: new Date('2023-11-10'),
      updatedAt: new Date('2023-11-10'),
    };
    this.transactions.set(tx2.id, tx2);

    // 6. Seed Watchlist
    const wl: DbWatchlist = {
      id: 'watchlist-demo-default',
      userId: demoUserId,
      name: 'High Conviction Ideas',
      description: 'Dip targets & breakout watches',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
    };
    this.watchlists.set(wl.id, wl);

    const wli: DbWatchlistItem = {
      id: 'wli-1',
      watchlistId: wl.id,
      instrumentId: 'inst-infy',
      targetEntryPrice: 1750.0,
      targetSellPrice: 2100.0,
      stopLoss: 1680.0,
      notes: 'Waiting for pullback to 50 EMA on daily chart',
      addedDate: new Date('2024-01-10'),
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date(),
    };
    this.watchlistItems.set(wli.id, wli);

    // 7. Seed Alert
    const alert1: DbAlert = {
      id: 'alert-1',
      userId: demoUserId,
      portfolioId: 'portfolio-demo-main',
      instrumentId: 'inst-rel',
      conditionType: 'PRICE_ABOVE',
      conditionValue: 3000.0,
      isActive: true,
      cooldownMinutes: 60,
      notificationChannels: 'in_app,email',
      notes: 'Alert when Reliance breaches ₹3,000 mark',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.alerts.set(alert1.id, alert1);
  }

  public logAudit(log: Omit<DbAuditLog, 'id' | 'createdAt'>): void {
    this.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...log,
    });
  }
}

export const dbManager = new DatabaseManager();
