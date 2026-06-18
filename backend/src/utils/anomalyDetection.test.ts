import {
  detectCampaignAnomalies,
  mean,
  stdDev,
  zScore,
  type DailyCampaignMetric,
} from './anomalyDetection';

const base = (date: string, spend: number, clicks: number, impressions: number, conversions: number): DailyCampaignMetric => ({
  date,
  spend,
  clicks,
  impressions,
  conversions,
});

describe('anomalyDetection math', () => {
  it('computes mean and stdDev', () => {
    expect(mean([10, 20, 30])).toBe(20);
    expect(stdDev([10, 20, 30])).toBeCloseTo(8.16, 1);
  });

  it('computes z-score', () => {
    expect(zScore(30, 20, 10)).toBe(1);
  });
});

describe('detectCampaignAnomalies', () => {
  const stableHistory: DailyCampaignMetric[] = [
    base('2026-05-01', 100, 50, 1000, 10),
    base('2026-05-02', 102, 51, 1010, 10),
    base('2026-05-03', 98, 49, 990, 10),
    base('2026-05-04', 101, 50, 1005, 10),
    base('2026-05-05', 99, 50, 1000, 10),
  ];

  it('returns empty when insufficient data', () => {
    expect(detectCampaignAnomalies(stableHistory.slice(0, 3))).toEqual([]);
  });

  it('flags CPA spike on latest day', () => {
    const withSpike = [
      ...stableHistory,
      base('2026-05-06', 250, 50, 1000, 5),
    ];
    const anomalies = detectCampaignAnomalies(withSpike, { zScoreThreshold: 1.5 });
    const cpa = anomalies.find((a) => a.metric === 'cpa');
    expect(cpa).toBeDefined();
    expect(cpa!.severity).toMatch(/warning|critical/);
    expect(cpa!.currentValue).toBeGreaterThan(cpa!.baselineValue);
  });

  it('flags CTR drop on latest day', () => {
    const withDrop = [
      ...stableHistory,
      base('2026-05-06', 100, 10, 1000, 10),
    ];
    const anomalies = detectCampaignAnomalies(withDrop, { zScoreThreshold: 1.5 });
    const ctr = anomalies.find((a) => a.metric === 'ctr');
    expect(ctr).toBeDefined();
    expect(ctr!.percentChange).toBeLessThan(0);
  });

  it('flags spend overshoot', () => {
    const withOvershoot = [
      ...stableHistory,
      base('2026-05-06', 400, 50, 1000, 10),
    ];
    const anomalies = detectCampaignAnomalies(withOvershoot, { zScoreThreshold: 1.5 });
    expect(anomalies.some((a) => a.metric === 'spend')).toBe(true);
  });
});
