import prisma from '../db';
import {
  buildForecastFromDailyData,
  formatDateUTC,
  type ForecastPoint,
  type ForecastResult,
} from '../utils/forecastMath';

export type { ForecastPoint, ForecastResult };

export class ForecastService {
  /**
   * Forecasts future campaign spend and conversions using Linear Regression and Moving Averages.
   */
  public static async getForecast(userId: string, daysToForecast = 7): Promise<ForecastResult> {
    const metrics = await prisma.campaignMetric.findMany({
      where: {
        campaign: {
          userId,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (metrics.length === 0) {
      return { historical: [], forecast: [] };
    }

    const dailyDataMap = new Map<
      string,
      { spend: number; clicks: number; impressions: number; conversions: number }
    >();
    metrics.forEach((m) => {
      const dateStr = formatDateUTC(m.date);
      const existing = dailyDataMap.get(dateStr) || {
        spend: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
      };
      existing.spend += m.spend;
      existing.clicks += m.clicks;
      existing.impressions += m.impressions;
      existing.conversions += m.conversions;
      dailyDataMap.set(dateStr, existing);
    });

    const historicalData = Array.from(dailyDataMap.entries()).map(([date, vals]) => ({
      date,
      spend: vals.spend,
      clicks: vals.clicks,
      impressions: vals.impressions,
      conversions: vals.conversions,
    }));

    return buildForecastFromDailyData(historicalData, daysToForecast);
  }
}
