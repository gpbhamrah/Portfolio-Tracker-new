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
    name?: string
  ): Promise<{ user: DbUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const resolvedName = name?.trim() || normalizedEmail.split('@')[0];

    // Check if user already exists
    const existing = await dbManager.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;

    const newUser: DbUser = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      name: resolvedName,
      isActive: true,
      emailVerified: false,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdUser = await dbManager.createUser(newUser, {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      theme: 'system',
      emailNotifications: true,
    });

    dbManager.logAudit({
      userId: createdUser.id,
      action: 'USER_REGISTER',
      resource: 'User',
      details: `New user registration for ${normalizedEmail}`,
    });

    const token = this.generateToken(createdUser);
    return { user: createdUser, token };
  }

  public async login(
    email: string,
    password: string
  ): Promise<{ user: DbUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbManager.findUserByEmail(normalizedEmail);

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

    // Update lastLoginAt
    await dbManager.updateUser(user.id, {
      lastLoginAt: new Date(),
    });

    dbManager.logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      details: `User logged in: ${normalizedEmail}`,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  public async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<boolean> {
    const user = await dbManager.findUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const isMatch = await this.comparePassword(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect.');
    }

    const newHash = await this.hashPassword(newPass);
    await dbManager.updateUser(userId, { passwordHash: newHash });

    dbManager.logAudit({
      userId,
      action: 'USER_PASSWORD_CHANGE',
      resource: 'User',
      details: 'Password was successfully updated',
    });

    return true;
  }

  public async deleteAccount(userId: string): Promise<boolean> {
    const user = await dbManager.findUserById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    await dbManager.deleteUser(userId);

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
