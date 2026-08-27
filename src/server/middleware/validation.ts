import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: err.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', '),
            details: err.issues,
          },
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid request payload.' },
      });
    }
  };
};

export const TransactionSchema = z.object({
  portfolioId: z.string().optional(),
  symbol: z.string().min(1, 'Stock ticker/symbol is required'),
  name: z.string().optional(),
  sector: z.string().optional(),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'BONUS', 'SPLIT', 'RIGHTS']).default('BUY'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  price: z.number().nonnegative('Price must be greater than or equal to 0'),
  brokerage: z.number().nonnegative().optional().default(0),
  taxes: z.number().nonnegative().optional().default(0),
  otherCharges: z.number().nonnegative().optional().default(0),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const AlertSchema = z.object({
  portfolioId: z.string().optional(),
  symbol: z.string().min(1, 'Stock ticker is required'),
  conditionType: z.string().min(1, 'Condition type is required'),
  conditionValue: z.number(),
  secondaryValue: z.number().optional(),
  cooldownMinutes: z.number().int().min(1).default(60),
  notificationChannels: z.string().default('in_app'),
  notes: z.string().optional(),
});
