import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbManager, DbUser } from '../db/dbManager';

const JWT_SECRET = process.env.JWT_SECRET || 'investing-journal-secure-token-secret-2026';
const JWT_EXPIRES_IN = '7d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export class AuthService {
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateToken(user: DbUser): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  public verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  public async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: DbUser; token: string }> {
    const existing = Array.from(dbManager.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;

    const newUser: DbUser = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      isActive: true,
      emailVerified: false,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbManager.users.set(userId, newUser);

    // Create user settings
    dbManager.userSettings.set(userId, {
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
    });

    // Create default portfolio
    const defaultPortfolioId = `port-${userId}-default`;
    dbManager.portfolios.set(defaultPortfolioId, {
      id: defaultPortfolioId,
      userId,
      name: 'Main Equity Portfolio',
      description: 'Primary long-term Indian equities',
      baseCurrency: 'INR',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create default watchlist
    const defaultWlId = `wl-${userId}-default`;
    dbManager.watchlists.set(defaultWlId, {
      id: defaultWlId,
      userId,
      name: 'Primary Watchlist',
      description: 'Breakout watches & entry targets',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dbManager.logAudit({
      userId,
      action: 'USER_REGISTER',
      resource: 'User',
      details: `New user registration for ${email}`,
    });

    const token = this.generateToken(newUser);
    return { user: newUser, token };
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ user: DbUser; token: string }> {
    const user = Array.from(dbManager.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      throw new Error('Invalid email or password credentials.');
    }

    if (!user.isActive) {
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password credentials.');
    }

    user.lastLoginAt = new Date();
    user.updatedAt = new Date();

    dbManager.logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      details: `User logged in from web client`,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  public async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<boolean> {
    const user = dbManager.users.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const isMatch = await this.comparePassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect.');
    }

    user.passwordHash = await this.hashPassword(newPass);
    user.updatedAt = new Date();

    dbManager.logAudit({
      userId,
      action: 'USER_PASSWORD_CHANGE',
      resource: 'User',
      details: 'Password was successfully updated',
    });

    return true;
  }

  public async deleteAccount(userId: string): Promise<boolean> {
    const user = dbManager.users.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    // Cascade delete portfolios, transactions, watchlists, alerts
    for (const [id, port] of dbManager.portfolios.entries()) {
      if (port.userId === userId) {
        dbManager.portfolios.delete(id);
      }
    }

    for (const [id, tx] of dbManager.transactions.entries()) {
      if (tx.userId === userId) {
        dbManager.transactions.delete(id);
      }
    }

    for (const [id, wl] of dbManager.watchlists.entries()) {
      if (wl.userId === userId) {
        dbManager.watchlists.delete(id);
      }
    }

    for (const [id, al] of dbManager.alerts.entries()) {
      if (al.userId === userId) {
        dbManager.alerts.delete(id);
      }
    }

    dbManager.userSettings.delete(userId);
    dbManager.users.delete(userId);

    dbManager.logAudit({
      userId,
      action: 'USER_DELETE_ACCOUNT',
      resource: 'User',
      details: `User ${user.email} deleted their account`,
    });

    return true;
  }
}

export const authService = new AuthService();
