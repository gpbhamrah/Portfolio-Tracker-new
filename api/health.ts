import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
  return res.status(200).json({
    status: 'ok',
    service: 'investing-journal-api',
    time: new Date().toISOString(),
  });
}
