import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Types for the repository layer
export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
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
 * Universal Database Manager with PostgreSQL Prisma integration
 * & memory-resilient store for dev/testing.
 */
class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private isPrismaConnected = false;

  // In-memory repositories with default seed data
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
    if (process.env.DATABASE_URL) {
      try {
        this.prisma = new PrismaClient();
        await this.prisma.$connect();
        this.isPrismaConnected = true;
        console.log('✅ PostgreSQL Database connected successfully via Prisma');
      } catch (err) {
        console.warn('⚠️ PostgreSQL connection failed, operating with in-memory resilient data store', err);
        this.isPrismaConnected = false;
      }
    } else {
      console.log('ℹ️ Running with in-memory database store (DATABASE_URL not specified)');
    }
  }

  public isConnected(): boolean {
    return this.isPrismaConnected;
  }

  private initDefaultSeed() {
    const demoPasswordHash = bcrypt.hashSync('Demo@1234', 10);
    const demoUserId = 'usr-demo-investor';

    // 1. User
    this.users.set(demoUserId, {
      id: demoUserId,
      email: 'demo@investingjournal.com',
      passwordHash: demoPasswordHash,
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
      {
        id: 'inst-tatamotors',
        symbol: 'TATAMOTORS.NS',
        exchange: 'NSE',
        name: 'Tata Motors Ltd.',
        companyName: 'Tata Motors Ltd.',
        sector: 'Auto',
        industry: 'Automobiles',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 995.6,
        previousClose: 980.0,
        change: 15.6,
        changePercent: 1.59,
        dayHigh: 1010.0,
        dayLow: 978.0,
        volume: 6400000,
        high52: 1179.0,
        low52: 593.5,
        ema20: 975.0,
        ema50: 940.0,
        ema200: 820.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'inst-itc',
        symbol: 'ITC.NS',
        exchange: 'NSE',
        name: 'ITC Ltd.',
        companyName: 'ITC Ltd.',
        sector: 'FMCG',
        industry: 'Diversified FMCG',
        instrumentType: 'STOCK',
        currency: 'INR',
        isActive: true,
        lastPrice: 485.3,
        previousClose: 480.0,
        change: 5.3,
        changePercent: 1.1,
        dayHigh: 490.0,
        dayLow: 479.0,
        volume: 5100000,
        high52: 520.0,
        low52: 399.3,
        ema20: 480.0,
        ema50: 465.0,
        ema200: 440.0,
        dataStatus: 'fresh',
        lastFetchedAt: new Date(),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
    ];

    for (const inst of defaultInstruments) {
      this.instruments.set(inst.id, inst);
      // Index by symbol as well
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
      instrumentId: 'inst-rel',
      transactionType: 'BUY',
      quantity: 15,
      price: 2600.0,
      brokerage: 20,
      taxes: 15,
      otherCharges: 5,
      transactionDate: new Date('2024-01-20'),
      notes: 'Added on breakout above resistance',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    };
    this.transactions.set(tx2.id, tx2);

    const tx3: DbTransaction = {
      id: 'tx-3',
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
    this.transactions.set(tx3.id, tx3);

    const tx4: DbTransaction = {
      id: 'tx-4',
      userId: demoUserId,
      portfolioId: 'portfolio-demo-main',
      instrumentId: 'inst-hdfc',
      transactionType: 'BUY',
      quantity: 50,
      price: 1520.0,
      brokerage: 20,
      taxes: 16,
      otherCharges: 5,
      transactionDate: new Date('2024-02-14'),
      notes: 'Private banking core pillar',
      createdAt: new Date('2024-02-14'),
      updatedAt: new Date('2024-02-14'),
    };
    this.transactions.set(tx4.id, tx4);

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

    // 8. Seed Notification
    const notif1: DbNotification = {
      id: 'notif-1',
      userId: demoUserId,
      alertId: alert1.id,
      type: 'TARGET_HIT',
      title: 'Target Approaching: RELIANCE',
      message: 'Reliance Industries is trading at ₹2,985.40, approaching target of ₹3,000.00',
      isRead: false,
      sentAt: new Date(),
      createdAt: new Date(),
    };
    this.notifications.set(notif1.id, notif1);
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
