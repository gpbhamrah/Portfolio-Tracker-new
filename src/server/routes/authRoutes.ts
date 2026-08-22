import { Router } from 'express';
import { authService } from '../services/authService';
import { dbManager } from '../db/dbManager';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, RegisterSchema, LoginSchema } from '../middleware/validation';

export const authRouter = Router();

// POST /api/auth/register (also supports /signup, /create-user, /new-user)
const handleRegister = async (req: any, res: any) => {
  try {
    const { email, password, name } = req.body;
    console.log(`[AUTH] Registration attempt for email: ${email}`);

    const { user, token } = await authService.register(email, password, name);
    console.log(`[AUTH] ✅ User registered successfully: id=${user.id}, email=${user.email}`);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (err: any) {
    console.error(`[AUTH] ❌ Registration failed for ${req.body?.email}:`, err.message);
    res.status(400).json({
      success: false,
      error: { code: 'REGISTRATION_FAILED', message: err.message || 'Registration failed' },
    });
  }
};

authRouter.post('/register', validateRequest(RegisterSchema), handleRegister);
authRouter.post('/signup', validateRequest(RegisterSchema), handleRegister);
authRouter.post('/create-user', validateRequest(RegisterSchema), handleRegister);
authRouter.post('/new-user', validateRequest(RegisterSchema), handleRegister);

// POST /api/auth/login
authRouter.post('/login', validateRequest(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt for email: ${email}`);

    const { user, token } = await authService.login(email, password);
    console.log(`[AUTH] ✅ Login successful for user: id=${user.id}, email=${user.email}`);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (err: any) {
    console.warn(`[AUTH] ❌ Login failed for ${req.body?.email}:`, err.message);
    res.status(401).json({
      success: false,
      error: { code: 'AUTHENTICATION_FAILED', message: err.message || 'Invalid email or password' },
    });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  console.log(`[AUTH] User logout requested`);
  res.clearCookie('token');
  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = dbManager.users.get(req.user!.userId);
  if (!user) {
    console.warn(`[AUTH] /me - User not found for token userId: ${req.user!.userId}`);
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User record not found' },
    });
    return;
  }

  const settings = dbManager.userSettings.get(user.id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      settings: settings || {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        theme: 'system',
      },
    },
  });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  console.log(`[AUTH] Forgot password request for email: ${email}`);
  res.json({
    success: true,
    data: { message: `Password reset instructions sent to ${email || 'your registered address'}` },
  });
});

