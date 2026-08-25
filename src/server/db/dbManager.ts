import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
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

// Global caching for Serverless Lambda instances (prevents pool exhaustion)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

/**
 * Universal Database Manager with PostgreSQL Prisma integration
 * & memory-resilient store for dev/testing.
 */
class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private isPrismaConnected = false;
  private initPromise: Promise<void> | null = null;

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
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl && dbUrl.trim().length > 0) {
        try {
          if (!globalForPrisma.prisma) {
            const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
            const pool = new pg.Pool({
              connectionString: dbUrl,
              ssl: isLocal ? false : { rejectUnauthorized: false },
              max: 10,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 8000,
            });

            globalForPrisma.pgPool = pool;
            const adapter = new PrismaPg(pool);
            globalForPrisma.prisma = new PrismaClient({ adapter });
          }

          this.prisma = globalForPrisma.prisma;
          await this.prisma.$connect();
          this.isPrismaConnected = true;
          console.log('✅ PostgreSQL Database connected successfully via Prisma');
        } catch (err: any) {
          console.warn('⚠️ PostgreSQL connection failed, operating with in-memory resilient data store:', err.message);
          this.isPrismaConnected = false;
        }
      } else {
        console.log('ℹ️ Running with in-memory database store (DATABASE_URL not specified)');
      }
    })();

    return this.initPromise;
  }

  public isConnected(): boolean {
    return this.isPrismaConnected;
  }

  public getPrisma(): PrismaClient | null {
    return this.prisma;
  }

  // --- USER REPOSITORY METHODS ---

  public async findUserById(id: string): Promise<DbUser | null> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const u = await this.prisma.user.findUnique({ where: { id } });
        if (u) {
          const user: DbUser = {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            isActive: u.isActive,
            emailVerified: u.emailVerified,
            role: u.role as 'USER' | 'ADMIN',
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn(`Prisma findUserById error for ${id}:`, err);
      }
    }
    return this.users.get(id) || null;
  }

  public async findUserByEmail(email: string): Promise<DbUser | null> {
    await this.initialize();
    const normalized = email.trim().toLowerCase();

    if (this.prisma && this.isPrismaConnected) {
      try {
        const u = await this.prisma.user.findUnique({ where: { email: normalized } });
        if (u) {
          const user: DbUser = {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            isActive: u.isActive,
            emailVerified: u.emailVerified,
            role: u.role as 'USER' | 'ADMIN',
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          };
          this.users.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn(`Prisma findUserByEmail error for ${normalized}:`, err);
      }
    }

    return (
      Array.from(this.users.values()).find((u) => u.email.toLowerCase() === normalized) || null
    );
  }

  public async createUser(
    user: DbUser,
    initialSettings?: Partial<DbUserSettings>
  ): Promise<DbUser> {
    await this.initialize();
    const normalizedEmail = user.email.trim().toLowerCase();

    if (this.prisma && this.isPrismaConnected) {
      try {
        const created = await this.prisma.user.create({
          data: {
            id: user.id,
            email: normalizedEmail,
            passwordHash: user.passwordHash,
            name: user.name,
            isActive: user.isActive ?? true,
            emailVerified: user.emailVerified ?? false,
            role: user.role ?? 'USER',
            settings: {
              create: {
                id: `settings-${user.id}`,
                currency: initialSettings?.currency || 'INR',
                timezone: initialSettings?.timezone || 'Asia/Kolkata',
                theme: initialSettings?.theme || 'system',
                emailNotifications: initialSettings?.emailNotifications ?? true,
                telegramNotifications: initialSettings?.telegramNotifications ?? false,
                whatsappNotifications: initialSettings?.whatsappNotifications ?? false,
              },
            },
            portfolios: {
              create: {
                id: `port-${user.id}-default`,
                name: 'Main Equity Portfolio',
                description: 'Primary long-term Indian equities',
                baseCurrency: 'INR',
                isDefault: true,
              },
            },
            watchlists: {
              create: {
                id: `wl-${user.id}-default`,
                name: 'Primary Watchlist',
                description: 'Breakout watches & entry targets',
              },
            },
          },
          include: {
            settings: true,
            portfolios: true,
            watchlists: true,
          },
        });

        const createdUser: DbUser = {
          id: created.id,
          email: created.email,
          passwordHash: created.passwordHash,
          name: created.name,
          isActive: created.isActive,
          emailVerified: created.emailVerified,
          role: created.role as 'USER' | 'ADMIN',
          lastLoginAt: created.lastLoginAt,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };

        this.users.set(createdUser.id, createdUser);
        return createdUser;
      } catch (err: any) {
        console.error('Prisma createUser failed:', err);
        throw err;
      }
    }

    // In-memory fallback
    this.users.set(user.id, user);
    this.userSettings.set(user.id, {
      id: `settings-${user.id}`,
      userId: user.id,
      currency: initialSettings?.currency || 'INR',
      timezone: initialSettings?.timezone || 'Asia/Kolkata',
      theme: initialSettings?.theme || 'system',
      emailNotifications: true,
      telegramNotifications: false,
      whatsappNotifications: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const defaultPortId = `port-${user.id}-default`;
    this.portfolios.set(defaultPortId, {
      id: defaultPortId,
      userId: user.id,
      name: 'Main Equity Portfolio',
      description: 'Primary long-term Indian equities',
      baseCurrency: 'INR',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const defaultWlId = `wl-${user.id}-default`;
    this.watchlists.set(defaultWlId, {
      id: defaultWlId,
      userId: user.id,
      name: 'Primary Watchlist',
      description: 'Breakout watches & entry targets',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return user;
  }

  public async updateUser(id: string, data: Partial<DbUser>): Promise<DbUser | null> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const updated = await this.prisma.user.update({
          where: { id },
          data: {
            name: data.name,
            passwordHash: data.passwordHash,
            isActive: data.isActive,
            emailVerified: data.emailVerified,
            role: data.role,
            lastLoginAt: data.lastLoginAt,
          },
        });

        const user: DbUser = {
          id: updated.id,
          email: updated.email,
          passwordHash: updated.passwordHash,
          name: updated.name,
          isActive: updated.isActive,
          emailVerified: updated.emailVerified,
          role: updated.role as 'USER' | 'ADMIN',
          lastLoginAt: updated.lastLoginAt,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };
        this.users.set(user.id, user);
        return user;
      } catch (err) {
        console.warn(`Prisma updateUser error for ${id}:`, err);
      }
    }

    const current = this.users.get(id);
    if (!current) return null;
    const updated: DbUser = {
      ...current,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  public async deleteUser(id: string): Promise<boolean> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        await this.prisma.user.delete({ where: { id } });
      } catch (err) {
        console.warn(`Prisma deleteUser error for ${id}:`, err);
      }
    }

    this.users.delete(id);
    this.userSettings.delete(id);
    for (const [pId, p] of this.portfolios.entries()) {
      if (p.userId === id) this.portfolios.delete(pId);
    }
    for (const [tId, t] of this.transactions.entries()) {
      if (t.userId === id) this.transactions.delete(tId);
    }
    for (const [wId, w] of this.watchlists.entries()) {
      if (w.userId === id) this.watchlists.delete(wId);
    }
    for (const [aId, a] of this.alerts.entries()) {
      if (a.userId === id) this.alerts.delete(aId);
    }
    return true;
  }

  // --- USER SETTINGS ---

  public async getUserSettings(userId: string): Promise<DbUserSettings | null> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const s = await this.prisma.userSettings.findUnique({ where: { userId } });
        if (s) {
          const settings: DbUserSettings = {
            id: s.id,
            userId: s.userId,
            currency: s.currency,
            timezone: s.timezone,
            theme: s.theme,
            defaultPortfolioId: s.defaultPortfolioId,
            emailNotifications: s.emailNotifications,
            telegramNotifications: s.telegramNotifications,
            whatsappNotifications: s.whatsappNotifications,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
          this.userSettings.set(userId, settings);
          return settings;
        }
      } catch (err) {
        console.warn(`Prisma getUserSettings error for ${userId}:`, err);
      }
    }
    return this.userSettings.get(userId) || null;
  }

  public async updateUserSettings(
    userId: string,
    data: Partial<DbUserSettings>
  ): Promise<DbUserSettings> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const s = await this.prisma.userSettings.upsert({
          where: { userId },
          create: {
            id: `settings-${userId}`,
            userId,
            currency: data.currency || 'INR',
            timezone: data.timezone || 'Asia/Kolkata',
            theme: data.theme || 'system',
            defaultPortfolioId: data.defaultPortfolioId,
            emailNotifications: data.emailNotifications ?? true,
            telegramNotifications: data.telegramNotifications ?? false,
            whatsappNotifications: data.whatsappNotifications ?? false,
          },
          update: {
            currency: data.currency,
            timezone: data.timezone,
            theme: data.theme,
            defaultPortfolioId: data.defaultPortfolioId,
            emailNotifications: data.emailNotifications,
            telegramNotifications: data.telegramNotifications,
            whatsappNotifications: data.whatsappNotifications,
          },
        });

        const settings: DbUserSettings = {
          id: s.id,
          userId: s.userId,
          currency: s.currency,
          timezone: s.timezone,
          theme: s.theme,
          defaultPortfolioId: s.defaultPortfolioId,
          emailNotifications: s.emailNotifications,
          telegramNotifications: s.telegramNotifications,
          whatsappNotifications: s.whatsappNotifications,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
        this.userSettings.set(userId, settings);
        return settings;
      } catch (err) {
        console.warn(`Prisma updateUserSettings error for ${userId}:`, err);
      }
    }

    const current = this.userSettings.get(userId) || {
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
      ...current,
      ...data,
      userId,
      updatedAt: new Date(),
    };
    this.userSettings.set(userId, updated);
    return updated;
  }

  // --- PORTFOLIO REPOSITORY METHODS ---

  public async getPortfolios(userId: string): Promise<DbPortfolio[]> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const ports = await this.prisma.portfolio.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        });
        if (ports.length > 0) {
          const list: DbPortfolio[] = ports.map((p) => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            description: p.description,
            baseCurrency: p.baseCurrency,
            isDefault: p.isDefault,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }));
          list.forEach((p) => this.portfolios.set(p.id, p));
          return list;
        }
      } catch (err) {
        console.warn(`Prisma getPortfolios error for ${userId}:`, err);
      }
    }

    return Array.from(this.portfolios.values()).filter((p) => p.userId === userId);
  }

  public async getPortfolioById(id: string): Promise<DbPortfolio | null> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const p = await this.prisma.portfolio.findUnique({ where: { id } });
        if (p) {
          const port: DbPortfolio = {
            id: p.id,
            userId: p.userId,
            name: p.name,
            description: p.description,
            baseCurrency: p.baseCurrency,
            isDefault: p.isDefault,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          };
          this.portfolios.set(port.id, port);
          return port;
        }
      } catch (err) {
        console.warn(`Prisma getPortfolioById error for ${id}:`, err);
      }
    }
    return this.portfolios.get(id) || null;
  }

  public async createPortfolio(portfolio: DbPortfolio): Promise<DbPortfolio> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const created = await this.prisma.portfolio.create({
          data: {
            id: portfolio.id,
            userId: portfolio.userId,
            name: portfolio.name,
            description: portfolio.description || null,
            baseCurrency: portfolio.baseCurrency || 'INR',
            isDefault: portfolio.isDefault || false,
          },
        });

        const port: DbPortfolio = {
          id: created.id,
          userId: created.userId,
          name: created.name,
          description: created.description,
          baseCurrency: created.baseCurrency,
          isDefault: created.isDefault,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
        this.portfolios.set(port.id, port);
        return port;
      } catch (err) {
        console.warn('Prisma createPortfolio error:', err);
      }
    }

    this.portfolios.set(portfolio.id, portfolio);
    return portfolio;
  }

  // --- TRANSACTIONS ---

  public async getTransactions(portfolioId: string, userId?: string): Promise<DbTransaction[]> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const txs = await this.prisma.transaction.findMany({
          where: {
            portfolioId,
            ...(userId ? { userId } : {}),
          },
          include: {
            instrument: true,
          },
          orderBy: { transactionDate: 'desc' },
        });

        const list: DbTransaction[] = txs.map((tx) => {
          if (tx.instrument) {
            this.instruments.set(tx.instrument.id, {
              id: tx.instrument.id,
              symbol: tx.instrument.symbol,
              exchange: tx.instrument.exchange,
              isin: tx.instrument.isin,
              name: tx.instrument.name,
              companyName: tx.instrument.companyName,
              sector: tx.instrument.sector || 'General',
              industry: tx.instrument.industry,
              instrumentType: tx.instrument.instrumentType as any,
              currency: tx.instrument.currency,
              isActive: tx.instrument.isActive,
              dataStatus: tx.instrument.dataStatus,
              createdAt: tx.instrument.createdAt,
              updatedAt: tx.instrument.updatedAt,
            });
          }

          return {
            id: tx.id,
            userId: tx.userId,
            portfolioId: tx.portfolioId,
            instrumentId: tx.instrumentId,
            transactionType: tx.transactionType as any,
            quantity: tx.quantity,
            price: tx.price,
            brokerage: tx.brokerage,
            taxes: tx.taxes,
            otherCharges: tx.otherCharges,
            transactionDate: tx.transactionDate,
            notes: tx.notes,
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt,
          };
        });

        list.forEach((t) => this.transactions.set(t.id, t));
        return list;
      } catch (err) {
        console.warn(`Prisma getTransactions error for ${portfolioId}:`, err);
      }
    }

    return Array.from(this.transactions.values())
      .filter((t) => t.portfolioId === portfolioId && (!userId || t.userId === userId))
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }

  public async createTransaction(tx: DbTransaction): Promise<DbTransaction> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        const created = await this.prisma.transaction.create({
          data: {
            id: tx.id,
            userId: tx.userId,
            portfolioId: tx.portfolioId,
            instrumentId: tx.instrumentId,
            transactionType: tx.transactionType as any,
            quantity: tx.quantity,
            price: tx.price,
            brokerage: tx.brokerage,
            taxes: tx.taxes,
            otherCharges: tx.otherCharges,
            transactionDate: tx.transactionDate,
            notes: tx.notes || null,
          },
        });

        const result: DbTransaction = {
          id: created.id,
          userId: created.userId,
          portfolioId: created.portfolioId,
          instrumentId: created.instrumentId,
          transactionType: created.transactionType as any,
          quantity: created.quantity,
          price: created.price,
          brokerage: created.brokerage,
          taxes: created.taxes,
          otherCharges: created.otherCharges,
          transactionDate: created.transactionDate,
          notes: created.notes,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
        this.transactions.set(result.id, result);
        return result;
      } catch (err) {
        console.warn('Prisma createTransaction error:', err);
      }
    }

    this.transactions.set(tx.id, tx);
    return tx;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    await this.initialize();
    if (this.prisma && this.isPrismaConnected) {
      try {
        await this.prisma.transaction.delete({ where: { id } });
      } catch (err) {
        console.warn(`Prisma deleteTransaction error for ${id}:`, err);
      }
    }
    this.transactions.delete(id);
    return true;
  }

  // --- INSTRUMENTS ---

  public async getOrUpsertInstrument(
    symbol: string,
    name?: string,
    sector?: string
  ): Promise<DbInstrument> {
    await this.initialize();
    const cleanSym = symbol.trim().toUpperCase();
    const existing =
      this.instruments.get(cleanSym) ||
      this.instruments.get(cleanSym.replace('.NS', '')) ||
      this.instruments.get(cleanSym.replace('.BO', ''));

    if (existing) return existing;

    if (this.prisma && this.isPrismaConnected) {
      try {
        const found = await this.prisma.instrument.findUnique({
          where: { symbol: cleanSym },
        });

        if (found) {
          const inst: DbInstrument = {
            id: found.id,
            symbol: found.symbol,
            exchange: found.exchange,
            isin: found.isin,
            name: found.name,
            companyName: found.companyName,
            sector: found.sector || 'General',
            industry: found.industry,
            instrumentType: found.instrumentType as any,
            currency: found.currency,
            isActive: found.isActive,
            lastPrice: found.lastPrice,
            previousClose: found.previousClose,
            change: found.change,
            changePercent: found.changePercent,
            dayHigh: found.dayHigh,
            dayLow: found.dayLow,
            volume: found.volume,
            high52: found.high52,
            low52: found.low52,
            ema20: found.ema20,
            ema50: found.ema50,
            ema100: found.ema100,
            ema200: found.ema200,
            rsi14: found.rsi14,
            dataStatus: found.dataStatus,
            lastFetchedAt: found.lastFetchedAt,
            createdAt: found.createdAt,
            updatedAt: found.updatedAt,
          };
          this.instruments.set(inst.id, inst);
          this.instruments.set(inst.symbol, inst);
          return inst;
        }

        const instId = `inst-${cleanSym.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const created = await this.prisma.instrument.create({
          data: {
            id: instId,
            symbol: cleanSym,
            exchange: cleanSym.endsWith('.BO') ? 'BSE' : 'NSE',
            name: name || cleanSym.replace('.NS', '').replace('.BO', ''),
            sector: sector || 'General',
            instrumentType: 'STOCK',
            currency: 'INR',
          },
        });

        const inst: DbInstrument = {
          id: created.id,
          symbol: created.symbol,
          exchange: created.exchange,
          isin: created.isin,
          name: created.name,
          companyName: created.companyName,
          sector: created.sector || 'General',
          industry: created.industry,
          instrumentType: created.instrumentType as any,
          currency: created.currency,
          isActive: created.isActive,
          dataStatus: created.dataStatus,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
        this.instruments.set(inst.id, inst);
        this.instruments.set(inst.symbol, inst);
        return inst;
      } catch (err) {
        console.warn(`Prisma getOrUpsertInstrument error for ${cleanSym}:`, err);
      }
    }

    const instId = `inst-${cleanSym.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const inst: DbInstrument = {
      id: instId,
      symbol: cleanSym,
      exchange: cleanSym.endsWith('.BO') ? 'BSE' : 'NSE',
      name: name || cleanSym.replace('.NS', '').replace('.BO', ''),
      companyName: name || cleanSym.replace('.NS', '').replace('.BO', ''),
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
    return inst;
  }

  // --- DEFAULT SEED FOR IN-MEMORY TESTING ---

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
