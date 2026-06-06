import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics';
import { OptimizationService } from '../services/optimization';

/**
 * Get computed marketing campaign analytics
 */
export async function getAnalyticsData(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const bypassCache = req.query.bypassCache === 'true';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const data = await AnalyticsService.getAnalytics(userId, bypassCache);
    return res.json(data);
  } catch (error: any) {
    console.error('Get Analytics Error:', error);
    return res.status(500).json({ error: 'Server error computing analytics.' });
  }
}

/**
 * Get the budget optimization recommendation strategy
 */
export async function getOptimizationStrategy(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const strategy = await OptimizationService.optimizeBudget(userId);
    return res.json(strategy);
  } catch (error: any) {
    console.error('Get Budget Optimization Error:', error);
    return res.status(500).json({ error: 'Server error computing budget optimization strategy.' });
  }
}
