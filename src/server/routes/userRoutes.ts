import { Router } from 'express';
import { dbManager } from '../db/dbManager';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

export const userRouter = Router();
userRouter.use(authenticateToken);

// GET /api/user/profile
userRouter.get('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const user = await dbManager.findUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'PROFILE_FETCH_FAILED', message: err.message } });
  }
});

// GET /api/user/settings
userRouter.get('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const settings = (await dbManager.getUserSettings(req.user!.userId)) || {
      id: `settings-${req.user!.userId}`,
      userId: req.user!.userId,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      theme: 'system',
      emailNotifications: true,
      telegramNotifications: false,
      whatsappNotifications: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SETTINGS_FETCH_FAILED', message: err.message } });
  }
});

// PUT /api/user/settings
userRouter.put('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const updated = await dbManager.updateUserSettings(userId, req.body);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SETTINGS_UPDATE_FAILED', message: err.message } });
  }
});

// DELETE /api/user/account
userRouter.delete('/account', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    await dbManager.deleteUser(userId);

    dbManager.logAudit({
      userId,
      action: 'USER_DELETE_ACCOUNT',
      resource: 'User',
      details: `User account deleted: ${userId}`,
    });

    res.json({
      success: true,
      data: { message: 'Account and associated portfolio data deleted successfully' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'ACCOUNT_DELETION_FAILED', message: err.message } });
  }
});
