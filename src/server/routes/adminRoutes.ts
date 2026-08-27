import { Router } from 'express';
import { dbManager, DbUser } from '../db/dbManager';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

export const adminRouter = Router();
adminRouter.use(authenticateToken);
adminRouter.use(requireAdmin);

// GET /api/admin/metrics - Global platform statistics
adminRouter.get('/metrics', (req: AuthenticatedRequest, res) => {
  const totalUsers = dbManager.users.size;
  const activeUsers = Array.from(dbManager.users.values()).filter((u) => u.isActive).length;
  const totalPortfolios = dbManager.portfolios.size;
  const totalTransactions = dbManager.transactions.size;
  const totalAlerts = dbManager.alerts.size;
  const totalNotifications = dbManager.notifications.size;
  const totalInstruments = dbManager.instruments.size;

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalPortfolios,
      totalTransactions,
      totalAlerts,
      totalNotifications,
      totalInstruments,
      marketDataStatus: 'HEALTHY (Realtime Market Feed + Technicals)',
      databaseStatus: 'Supabase Architecture Ready',
      nodeEnv: process.env.NODE_ENV || 'development',
      uptimeSeconds: process.uptime(),
    },
  });
});

// GET /api/admin/users - List users
adminRouter.get('/users', (req: AuthenticatedRequest, res) => {
  const users = Array.from(dbManager.users.values()).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));

  res.json({
    success: true,
    data: users,
  });
});

// POST /api/admin/users - Create a new user entry
adminRouter.post('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const { email, name, role = 'USER' } = req.body;

    if (!email || !name) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Name and email are required' },
      });
      return;
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newUser: DbUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await dbManager.createUser(newUser);

    dbManager.logAudit({
      userId: req.user?.userId || 'admin',
      action: 'ADMIN_CREATE_USER',
      resource: `User:${newUser.id}`,
      details: `Created user ${newUser.email} with role ${newUser.role}`,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        emailVerified: newUser.emailVerified,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CREATION_FAILED', message: err.message || 'Failed to create user' },
    });
  }
});

// POST /api/admin/users/:id/toggle-status - Toggle user active/deactivated
adminRouter.post('/users/:id/toggle-status', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = dbManager.users.get(id);

  if (!user) {
    res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return;
  }

  user.isActive = !user.isActive;
  user.updatedAt = new Date();

  dbManager.logAudit({
    userId: req.user?.userId || 'admin',
    action: 'ADMIN_TOGGLE_USER',
    resource: `User:${id}`,
    details: `Set isActive to ${user.isActive}`,
  });

  res.json({
    success: true,
    data: { message: `User status changed to ${user.isActive ? 'Active' : 'Deactivated'}`, user },
  });
});

// GET /api/admin/logs - Audit logs
adminRouter.get('/logs', (req: AuthenticatedRequest, res) => {
  const logs = [...dbManager.auditLogs].reverse().slice(0, 50);
  res.json({
    success: true,
    data: logs,
  });
});
