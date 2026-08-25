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

// POST /api/user/change-password
userRouter.post('/change-password', async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'New password must be at least 6 characters' },
      });
      return;
    }

    const { authService } = await import('../services/authService');
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'PASSWORD_CHANGE_FAILED', message: err.message || 'Failed to update password' },
    });
  }
});

// DELETE /api/user/account
userRouter.delete('/account', async (req: AuthenticatedRequest, res) => {
  try {
    const { authService } = await import('../services/authService');
    await authService.deleteAccount(req.user!.userId);

    res.json({
      success: true,
      data: { message: 'Account and associated portfolio data deleted successfully' },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: err.message || 'Failed to delete account' },
    });
  }
});
