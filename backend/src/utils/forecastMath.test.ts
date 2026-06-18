import {
  addDaysUTC,
  buildForecastFromDailyData,
  calculateLinearRegression,
  computeDowSeasonalFactors,
  daysBetweenUTC,
  getDayOfWeekUTC,
  isHoliday,
  isUSHoliday,
} from './forecastMath';
import { isIndiaHoliday } from './indiaHolidays';

const sampleMetric = {
  clicks: 1500,
  impressions: 22500,
};

describe('calculateLinearRegression', () => {
  it('fits a perfect linear sequence', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [10, 20, 30, 40, 50];
    const { slope, intercept } = calculateLinearRegression(x, y);
    expect(slope).toBeCloseTo(10);
    expect(intercept).toBeCloseTo(10);
  });

  it('returns zero slope for flat data', () => {
    const x = [0, 1, 2];
    const y = [5, 5, 5];
    const { slope, intercept } = calculateLinearRegression(x, y);
    expect(slope).toBe(0);
    expect(intercept).toBe(5);
  });

  it('uses real calendar gaps as x-axis (not row index)', () => {
    const x = [0, 7, 14];
    const y = [100, 200, 300];
    const { slope, intercept } = calculateLinearRegression(x, y);
    expect(slope).toBeCloseTo(100 / 7, 4);
    expect(intercept).toBeCloseTo(100);
  });
});

describe('addDaysUTC', () => {
  it('advances calendar days without local timezone drift', () => {
    expect(addDaysUTC('2026-05-28', 1)).toBe('2026-05-29');
    expect(addDaysUTC('2026-05-28', 7)).toBe('2026-06-04');
  });
});

describe('daysBetweenUTC', () => {
  it('counts inclusive calendar distance', () => {
    expect(daysBetweenUTC('2026-05-01', '2026-05-08')).toBe(7);
    expect(daysBetweenUTC('2026-05-01', '2026-05-01')).toBe(0);
  });
});

describe('isIndiaHoliday', () => {
  it('detects fixed and major festival holidays', () => {
    expect(isIndiaHoliday('2026-01-26')).toBe(true);
    expect(isIndiaHoliday('2026-08-15')).toBe(true);
    expect(isIndiaHoliday('2026-11-08')).toBe(true);
    expect(isIndiaHoliday('2026-05-15')).toBe(false);
  });
});

describe('isHoliday', () => {
  it('covers both US and India calendars', () => {
    expect(isHoliday('2026-07-04')).toBe(true);
    expect(isHoliday('2026-01-26')).toBe(true);
    expect(isHoliday('2026-05-15')).toBe(false);
  });
});

describe('isUSHoliday', () => {
  it('detects fixed and floating federal holidays', () => {
    expect(isUSHoliday('2026-07-04')).toBe(true);
    expect(isUSHoliday('2026-12-25')).toBe(true);
    expect(isUSHoliday('2026-11-26')).toBe(true);
    expect(isUSHoliday('2026-05-28')).toBe(false);
  });
});

describe('computeDowSeasonalFactors', () => {
  it('lowers weekend factor when Saturdays underperform', () => {
    const data = [
      { date: '2026-05-25', spend: 100, ...sampleMetric, conversions: 10 },
      { date: '2026-05-26', spend: 100, ...sampleMetric, conversions: 10 },
      { date: '2026-05-30', spend: 50, ...sampleMetric, conversions: 5 },
    ];
    const factors = computeDowSeasonalFactors(data, 'spend');
    const saturday = getDayOfWeekUTC('2026-05-30');
    expect(factors[saturday]).toBeLessThan(1);
  });
});

describe('buildForecastFromDailyData', () => {
  const sampleHistory = [
    { date: '2026-05-24', spend: 780.5, clicks: 1200, impressions: 18000, conversions: 75 },
    { date: '2026-05-25', spend: 800, clicks: 1250, impressions: 18750, conversions: 75 },
    { date: '2026-05-26', spend: 776, clicks: 1180, impressions: 17700, conversions: 76 },
    { date: '2026-05-27', spend: 790, clicks: 1220, impressions: 18300, conversions: 78 },
    { date: '2026-05-28', spend: 810, clicks: 1280, impressions: 19200, conversions: 80 },
  ];

  it('returns empty when fewer than 3 unique days', () => {
    expect(buildForecastFromDailyData(sampleHistory.slice(0, 2), 7)).toEqual({
      historical: [],
      forecast: [],
    });
  });

  it('produces the expected number of forecast points', () => {
    const result = buildForecastFromDailyData(sampleHistory, 7);
    expect(result.historical).toHaveLength(5);
    expect(result.forecast).toHaveLength(7);
  });

  it('includes clicks and impressions in historical and forecast', () => {
    const result = buildForecastFromDailyData(sampleHistory, 3);
    expect(result.historical[0].actualClicks).toBe(1200);
    expect(result.historical[0].actualImpressions).toBe(18000);
    expect(result.forecast[0].forecastClicks).toBeGreaterThan(0);
    expect(result.forecast[0].forecastImpressions).toBeGreaterThanOrEqual(
      result.forecast[0].forecastClicks!
    );
  });

  it('starts forecast dates on the day after the last historical date', () => {
    const result = buildForecastFromDailyData(sampleHistory, 3);
    expect(result.forecast[0].date).toBe('2026-05-29');
    expect(result.forecast[2].date).toBe('2026-05-31');
  });

  it('never returns negative forecast values', () => {
    const declining = [
      { date: '2026-06-01', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
      { date: '2026-06-02', spend: 50, clicks: 50, impressions: 750, conversions: 5 },
      { date: '2026-06-03', spend: 10, clicks: 10, impressions: 150, conversions: 1 },
    ];
    const result = buildForecastFromDailyData(declining, 5);
    result.forecast.forEach((p) => {
      expect(p.forecastSpend).toBeGreaterThanOrEqual(0);
      expect(p.forecastClicks).toBeGreaterThanOrEqual(0);
      expect(p.forecastImpressions).toBeGreaterThanOrEqual(0);
      expect(p.forecastConversions).toBeGreaterThanOrEqual(0);
    });
  });

  it('forecasts using calendar gaps when history has missing weeks', () => {
    const gapped = [
      { date: '2026-05-01', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
      { date: '2026-05-08', spend: 200, clicks: 200, impressions: 3000, conversions: 20 },
      { date: '2026-05-15', spend: 300, clicks: 300, impressions: 4500, conversions: 30 },
    ];
    const result = buildForecastFromDailyData(gapped, 1);
    expect(result.forecast[0].date).toBe('2026-05-16');
    expect(result.forecast[0].forecastSpend).toBeCloseTo(280, 0);
  });

  it('dampens forecasts on US holidays', () => {
    const beforeHoliday = buildForecastFromDailyData(
      [
        { date: '2026-07-01', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
        { date: '2026-07-02', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
        { date: '2026-07-03', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
      ],
      2
    );
    const july4 = beforeHoliday.forecast.find((p) => p.date === '2026-07-04');
    const july5 = beforeHoliday.forecast.find((p) => p.date === '2026-07-05');
    expect(july4).toBeDefined();
    expect(july5).toBeDefined();
    expect(july4!.forecastSpend!).toBeLessThan(july5!.forecastSpend!);
  });

  it('dampens forecasts on India holidays', () => {
    const beforeRepublicDay = buildForecastFromDailyData(
      [
        { date: '2026-01-22', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
        { date: '2026-01-23', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
        { date: '2026-01-24', spend: 100, clicks: 100, impressions: 1500, conversions: 10 },
      ],
      3
    );
    const republicDay = beforeRepublicDay.forecast.find((p) => p.date === '2026-01-26');
    const adjacent = beforeRepublicDay.forecast.find((p) => p.date === '2026-01-27');
    expect(republicDay).toBeDefined();
    expect(adjacent).toBeDefined();
    expect(republicDay!.forecastSpend!).toBeLessThan(adjacent!.forecastSpend!);
  });
});
