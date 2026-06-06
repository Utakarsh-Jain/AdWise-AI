import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ForecastService } from '../services/forecast';

/**
 * Get forecast projections for Spend and Conversions
 */
export async function getForecastData(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string, 10) || 7;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (days <= 0 || days > 30) {
      return res.status(400).json({ error: 'Forecast range must be between 1 and 30 days.' });
    }

    const forecast = await ForecastService.getForecast(userId, days);
    return res.json(forecast);
  } catch (error: any) {
    console.error('Get Forecast Error:', error);
    return res.status(500).json({ error: 'Server error calculating projections.' });
  }
}
