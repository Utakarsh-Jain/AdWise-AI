import prisma from '../db';

export interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  platform: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  ctr: number;             // Click Through Rate %
  cpc: number;             // Cost Per Click
  conversionRate: number;  // Conversion Rate %
  cpa: number;             // Cost Per Acquisition
  performanceScore: number; // Custom Score (0-100)
}

export interface PlatformSummary {
  platform: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  shareOfSpend: number;
}

export interface AggregatedMetrics {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  avgConversionRate: number;
  avgCpa: number;
  overallScore: number;
  campaigns: CampaignSummary[];
  platforms: PlatformSummary[];
}

export class AnalyticsService {
  /**
   * Fetches and computes marketing analytics metrics for a user.
   * Utilizes database caching to optimize read operations.
   */
  public static async getAnalytics(userId: string, bypassCache = false): Promise<AggregatedMetrics> {
    // 1. Check Caching
    if (!bypassCache) {
      const cachedReport = await prisma.report.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (cachedReport) {
        try {
          return JSON.parse(cachedReport.reportData) as AggregatedMetrics;
        } catch (e) {
          console.error('Failed to parse cached report:', e);
        }
      }
    }

    // 2. Fetch all campaign metrics for this user
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        metrics: true,
      },
    });

    if (campaigns.length === 0) {
      return this.emptyMetrics();
    }

    // 3. Compute metrics for each campaign
    const campaignSummaries: CampaignSummary[] = [];
    let grandSpend = 0;
    let grandClicks = 0;
    let grandImpressions = 0;
    let grandConversions = 0;

    // We first compute basic aggregates for each campaign
    campaigns.forEach(c => {
      let spend = 0;
      let clicks = 0;
      let impressions = 0;
      let conversions = 0;

      c.metrics.forEach(m => {
        spend += m.spend;
        clicks += m.clicks;
        impressions += m.impressions;
        conversions += m.conversions;
      });

      grandSpend += spend;
      grandClicks += clicks;
      grandImpressions += impressions;
      grandConversions += conversions;

      // KPI Formulas
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      campaignSummaries.push({
        campaignId: c.id,
        campaignName: c.campaignName,
        platform: c.platform,
        totalSpend: spend,
        totalClicks: clicks,
        totalImpressions: impressions,
        totalConversions: conversions,
        ctr,
        cpc,
        conversionRate,
        cpa,
        performanceScore: 0, // Calculated in next pass
      });
    });

    // 4. Calculate Custom Performance Score
    // Formula: Score = 40% CR score + 30% CTR score + 30% CPA efficiency score
    // CR Score: CR of 3% is scaled to 100. CR of 1.5% yields 50, etc.
    // CTR Score: CTR of 1.5% is scaled to 100.
    // CPA Score: We evaluate Conversions per Dollar (Efficiency).
    // Let's compute average Conversions per Dollar across all campaigns.
    const averageCpa = grandConversions > 0 ? grandSpend / grandConversions : 0;

    campaignSummaries.forEach(c => {
      // Scale Conversion Rate (excellent target: >= 3%)
      const crScore = Math.min((c.conversionRate / 3.0) * 100, 100);

      // Scale CTR (excellent target: >= 1.5%)
      const ctrScore = Math.min((c.ctr / 1.5) * 100, 100);

      // Scale CPA (cost-effectiveness). If campaign has conversions, compare its CPA to overall average.
      // If CPA is 0 (free conversions), it scores 100. If CPA <= averageCpa, it scores between 50 and 100.
      // If CPA > averageCpa, it scores below 50.
      let cpaScore = 0;
      if (c.totalConversions === 0) {
        cpaScore = c.totalSpend > 0 ? 0 : 50; // no conversions, but spent money -> 0; spent nothing -> 50
      } else if (c.cpa === 0) {
        cpaScore = 100;
      } else {
        // Lower CPA relative to average is better.
        // Ratio of averageCpa / campaign.cpa. E.g. average is $20, campaign is $10 -> ratio is 2x -> score 100
        const ratio = averageCpa / c.cpa;
        cpaScore = Math.min(ratio * 50, 100);
      }

      // Combine weights
      const rawScore = 0.4 * crScore + 0.3 * ctrScore + 0.3 * cpaScore;
      c.performanceScore = Math.round(isNaN(rawScore) ? 0 : rawScore);
    });

    // Sort campaigns by performance score descending
    campaignSummaries.sort((a, b) => b.performanceScore - a.performanceScore);

    // 5. Compute Platform Summaries
    const platformMap = new Map<string, {
      spend: number;
      clicks: number;
      impressions: number;
      conversions: number;
    }>();

    campaignSummaries.forEach(c => {
      const pData = platformMap.get(c.platform) || { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      pData.spend += c.totalSpend;
      pData.clicks += c.totalClicks;
      pData.impressions += c.totalImpressions;
      pData.conversions += c.totalConversions;
      platformMap.set(c.platform, pData);
    });

    const platformSummaries: PlatformSummary[] = [];
    platformMap.forEach((v, platform) => {
      platformSummaries.push({
        platform,
        totalSpend: v.spend,
        totalClicks: v.clicks,
        totalImpressions: v.impressions,
        totalConversions: v.conversions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        cpc: v.clicks > 0 ? v.spend / v.clicks : 0,
        conversionRate: v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0,
        cpa: v.conversions > 0 ? v.spend / v.conversions : 0,
        shareOfSpend: grandSpend > 0 ? (v.spend / grandSpend) * 100 : 0,
      });
    });

    // Sort platform summaries by spend share descending
    platformSummaries.sort((a, b) => b.shareOfSpend - a.shareOfSpend);

    // 6. Overall Metrics
    const overallScore = campaignSummaries.length > 0
      ? Math.round(campaignSummaries.reduce((sum, c) => sum + c.performanceScore, 0) / campaignSummaries.length)
      : 0;

    const result: AggregatedMetrics = {
      totalSpend: grandSpend,
      totalClicks: grandClicks,
      totalImpressions: grandImpressions,
      totalConversions: grandConversions,
      avgCtr: grandImpressions > 0 ? (grandClicks / grandImpressions) * 100 : 0,
      avgCpc: grandClicks > 0 ? grandSpend / grandClicks : 0,
      avgConversionRate: grandClicks > 0 ? (grandConversions / grandClicks) * 100 : 0,
      avgCpa: grandConversions > 0 ? grandSpend / grandConversions : 0,
      overallScore,
      campaigns: campaignSummaries,
      platforms: platformSummaries,
    };

    // 7. Write to cache
    await prisma.report.create({
      data: {
        userId,
        reportData: JSON.stringify(result),
      },
    }).catch(err => {
      console.error('Failed to cache report:', err);
    });

    return result;
  }

  private static emptyMetrics(): AggregatedMetrics {
    return {
      totalSpend: 0,
      totalClicks: 0,
      totalImpressions: 0,
      totalConversions: 0,
      avgCtr: 0,
      avgCpc: 0,
      avgConversionRate: 0,
      avgCpa: 0,
      overallScore: 0,
      campaigns: [],
      platforms: [],
    };
  }
}
