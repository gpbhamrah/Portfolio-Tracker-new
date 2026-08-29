import { Router } from 'express';
import { dbManager, DbAlert } from '../db/dbManager';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, AlertSchema } from '../middleware/validation';

export const alertRouter = Router();
alertRouter.use(authenticateToken);
alertRouter.use(requireAuth);

// GET /api/alerts - List all alerts for user
alertRouter.get('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const userAlerts = Array.from(dbManager.alerts.values())
    .filter((a) => a.userId === userId)
    .map((a) => {
      const inst = a.instrumentId ? dbManager.instruments.get(a.instrumentId) : null;
      return {
        ...a,
        symbol: inst?.symbol || 'N/A',
        name: inst?.name || 'N/A',
      };
    });

  res.json({
    success: true,
    data: userAlerts,
  });
});

// POST /api/alerts - Create alert
alertRouter.post('/', validateRequest(AlertSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { symbol, conditionType, conditionValue, secondaryValue, cooldownMinutes = 60, notificationChannels = 'in_app', notes } = req.body;

    const cleanSym = symbol.trim().toUpperCase().endsWith('.NS')
      ? symbol.trim().toUpperCase()
      : `${symbol.trim().toUpperCase()}.NS`;

    const inst = await dbManager.getOrUpsertInstrument(cleanSym, cleanSym.replace('.NS', ''), 'General');

    const alertId = `alt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newAlert: DbAlert = {
      id: alertId,
      userId,
      instrumentId: inst.id,
      conditionType,
      conditionValue,
      secondaryValue: secondaryValue || null,
      isActive: true,
      cooldownMinutes,
      notificationChannels,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbManager.alerts.set(alertId, newAlert);

    res.status(201).json({
      success: true,
      data: {
        ...newAlert,
        symbol: inst.symbol,
        name: inst.name,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'ALERT_CREATION_FAILED', message: err.message },
    });
  }
});

// DELETE /api/alerts/:id - Delete an alert
alertRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const alert = dbManager.alerts.get(id);

  if (alert && alert.userId === req.user!.userId) {
    dbManager.alerts.delete(id);
  }

  res.json({
    success: true,
    data: { message: 'Alert deleted' },
  });
});

// GET /api/alerts/notifications - List in-app notifications
alertRouter.get('/notifications', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const userNotifs = Array.from(dbManager.notifications.values())
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

  res.json({
    success: true,
    data: userNotifs,
  });
});

// POST /api/alerts/notifications/:id/read - Mark notification as read
alertRouter.post('/notifications/:id/read', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const notif = dbManager.notifications.get(id);

  if (notif && notif.userId === req.user!.userId) {
    notif.isRead = true;
  }

  res.json({
    success: true,
    data: { message: 'Notification marked as read' },
  });
});
