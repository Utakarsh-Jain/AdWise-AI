import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SocialAnalyticsService } from '../services/socialAnalytics';
import { SocialInsightsService } from '../services/socialInsights';

/**
 * Retrieves computed statistics and chart series data for social dashboard.
 */
export async function getSocialAnalytics(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const analytics = await SocialAnalyticsService.getAnalytics(userId);
    return res.json(analytics);
  } catch (error: any) {
    console.error('Get Social Analytics Error:', error);
    return res.status(500).json({ error: 'Server error computing social analytics.' });
  }
}

/**
 * Generates natural language insights for social patterns (using Gemini or heuristically).
 */
export async function getSocialInsights(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const analytics = await SocialAnalyticsService.getAnalytics(userId);
    const insights = await SocialInsightsService.generateInsights(analytics);
    return res.json({ insights });
  } catch (error: any) {
    console.error('Get Social Insights Error:', error);
    return res.status(500).json({ error: 'Server error generating social insights.' });
  }
}

/**
 * Returns content structure recommendations for the next posts.
 */
export async function getSocialRecommendations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const analytics = await SocialAnalyticsService.getAnalytics(userId);
    const recommendations = await SocialInsightsService.generateRecommendations(analytics);
    return res.json(recommendations);
  } catch (error: any) {
    console.error('Get Social Recommendations Error:', error);
    return res.status(500).json({ error: 'Server error computing social recommendations.' });
  }
}
