import prisma from '../db';

export interface ForecastPoint {
  date: string;
  actualSpend?: number;
  actualConversions?: number;
  forecastSpend?: number;
  forecastConversions?: number;
}

export interface ForecastResult {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
}

export class ForecastService {
  /**
   * Forecasts future campaign spend and conversions using Linear Regression and Moving Averages.
   * Coded from scratch in TypeScript.
   */
  public static async getForecast(userId: string, daysToForecast = 7): Promise<ForecastResult> {
    // 1. Fetch historical daily aggregated data
    // Fetch metrics grouped by date
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

    if (metrics.length < 3) {
      return { historical: [], forecast: [] };
    }

    // Aggregate metrics by date (in case of multiple campaigns per date)
    const dailyDataMap = new Map<string, { spend: number; conversions: number }>();
    metrics.forEach(m => {
      const dateStr = m.date.toISOString().split('T')[0];
      const existing = dailyDataMap.get(dateStr) || { spend: 0, conversions: 0 };
      existing.spend += m.spend;
      existing.conversions += m.conversions;
      dailyDataMap.set(dateStr, existing);
    });

    const historicalData = Array.from(dailyDataMap.entries()).map(([date, vals]) => ({
      date,
      spend: vals.spend,
      conversions: vals.conversions,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const n = historicalData.length;

    // 2. Linear Regression calculations
    // Independent variable X = index of days (0 to n-1)
    // Dependent variables Y = spend, conversions
    const xValues = Array.from({ length: n }, (_, i) => i);
    const ySpend = historicalData.map(h => h.spend);
    const yConversions = historicalData.map(h => h.conversions);

    const spendRegression = this.calculateLinearRegression(xValues, ySpend);
    const conversionsRegression = this.calculateLinearRegression(xValues, yConversions);

    // 3. Moving Average calculation (7-day window)
    // We compute the moving average of the last 7 days of historical data
    // to provide an alternative forecast baseline
    const movingAvgWindow = Math.min(7, n);
    const lastDaysSpend = ySpend.slice(-movingAvgWindow);
    const lastDaysConversions = yConversions.slice(-movingAvgWindow);

    const avgSpend = lastDaysSpend.reduce((a, b) => a + b, 0) / movingAvgWindow;
    const avgConversions = lastDaysConversions.reduce((a, b) => a + b, 0) / movingAvgWindow;

    // 4. Build historical data array
    const historicalPoints: ForecastPoint[] = historicalData.map(h => ({
      date: h.date,
      actualSpend: h.spend,
      actualConversions: h.conversions,
    }));

    // 5. Generate future forecast points
    const forecastPoints: ForecastPoint[] = [];
    const lastDate = new Date(historicalData[n - 1].date);

    for (let i = 1; i <= daysToForecast; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const xFuture = n - 1 + i;

      // Linear Regression Predictions: y = mx + c
      let lrSpend = spendRegression.slope * xFuture + spendRegression.intercept;
      let lrConversions = conversionsRegression.slope * xFuture + conversionsRegression.intercept;

      // Bound checks: metrics cannot be negative
      lrSpend = Math.max(0, lrSpend);
      lrConversions = Math.max(0, lrConversions);

      // We blend Linear Regression (70% weight) with Moving Average (30% weight)
      // to capture both the long-term trend and the short-term volume stability
      const blendedSpend = lrSpend * 0.7 + avgSpend * 0.3;
      const blendedConversions = lrConversions * 0.7 + avgConversions * 0.3;

      forecastPoints.push({
        date: nextDateStr,
        forecastSpend: parseFloat(blendedSpend.toFixed(2)),
        forecastConversions: Math.round(blendedConversions),
      });
    }

    return {
      historical: historicalPoints,
      forecast: forecastPoints,
    };
  }

  /**
   * Least Squares Method: computes slope (m) and intercept (c) for y = mx + c
   */
  private static calculateLinearRegression(x: number[], y: number[]) {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
      num += (x[i] - meanX) * (y[i] - meanY);
      den += Math.pow(x[i] - meanX, 2);
    }

    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  }
}
