import prisma from '../db';

export interface SocialAnalyticsResult {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  totalReach: number;
  avgEngagementRate: number;
  bestPostingHour: number;
  bestPostingHourScore: number;
  lowestPostingHour: number;
  lowestPostingHourScore: number;
  bestPostingDay: number;
  bestPostingDayScore: number;
  contentTypeComparison: Array<{
    type: string;
    avgEngagementRate: number;
    count: number;
  }>;
  hourlyEngagement: Array<{
    hour: number;
    engagementRate: number;
  }>;
  dailyEngagement: Array<{
    day: number; // 0-6
    dayName: string;
    engagementRate: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    impressions: number;
    reach: number;
    posts: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    avgEngagementRate: number;
    count: number;
  }>;
}

export class SocialAnalyticsService {
  /**
   * Computes social metrics and features analytics.
   */
  public static async getAnalytics(userId: string): Promise<SocialAnalyticsResult> {
    const posts = await prisma.post.findMany({
      where: { userId },
      include: { features: true },
    });

    if (posts.length === 0) {
      return this.emptyAnalytics();
    }

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalImpressions = 0;
    let totalReach = 0;

    // Grouping variables
    const hourStats = new Map<number, { sumER: number; count: number }>();
    const dayStats = new Map<number, { sumER: number; count: number }>();
    const typeStats = new Map<string, { sumER: number; count: number }>();
    const topicStats = new Map<string, { sumER: number; count: number }>();
    const monthStats = new Map<string, { impressions: number; reach: number; count: number }>();

    posts.forEach(post => {
      totalLikes += post.likes;
      totalComments += post.comments;
      totalShares += post.shares;
      totalImpressions += post.impressions;
      totalReach += post.reach;

      // Engagement Rate = (likes + comments + shares) / impressions * 100
      const er = post.impressions > 0 
        ? ((post.likes + post.comments + post.shares) / post.impressions) * 100 
        : 0;

      // Hour of day
      const hour = post.features?.postingHour ?? post.createdAt.getHours();
      const hData = hourStats.get(hour) || { sumER: 0, count: 0 };
      hData.sumER += er;
      hData.count += 1;
      hourStats.set(hour, hData);

      // Day of week
      const day = post.features?.postingDay ?? post.createdAt.getDay();
      const dData = dayStats.get(day) || { sumER: 0, count: 0 };
      dData.sumER += er;
      dData.count += 1;
      dayStats.set(day, dData);

      // Media Type
      const type = post.mediaType;
      const tData = typeStats.get(type) || { sumER: 0, count: 0 };
      tData.sumER += er;
      tData.count += 1;
      typeStats.set(type, tData);

      // Topic
      const topic = post.features?.topic || 'General';
      const topData = topicStats.get(topic) || { sumER: 0, count: 0 };
      topData.sumER += er;
      topData.count += 1;
      topicStats.set(topic, topData);

      // Monthly Growth
      const date = post.createdAt;
      const monthStr = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      const mData = monthStats.get(monthStr) || { impressions: 0, reach: 0, count: 0 };
      mData.impressions += post.impressions;
      mData.reach += post.reach;
      mData.count += 1;
      monthStats.set(monthStr, mData);
    });

    // Compute Engagement Rate averages and find bests
    let bestPostingHour = 9;
    let bestPostingHourScore = 0;
    let lowestPostingHour = 20;
    let lowestPostingHourScore = Infinity;

    for (let h = 0; h < 24; h++) {
      const hData = hourStats.get(h);
      if (hData) {
        const avg = hData.sumER / hData.count;
        if (avg > bestPostingHourScore) {
          bestPostingHour = h;
          bestPostingHourScore = avg;
        }
        if (avg < lowestPostingHourScore) {
          lowestPostingHour = h;
          lowestPostingHourScore = avg;
        }
      }
    }

    // Default values if no variance
    if (lowestPostingHourScore === Infinity) lowestPostingHourScore = 0;

    let bestPostingDay = 4; // default Thursday
    let bestPostingDayScore = 0;

    for (let d = 0; d < 7; d++) {
      const dData = dayStats.get(d);
      if (dData) {
        const avg = dData.sumER / dData.count;
        if (avg > bestPostingDayScore) {
          bestPostingDay = d;
          bestPostingDayScore = avg;
        }
      }
    }

    // Format hourly response (0 to 23)
    const hourlyEngagement = Array.from({ length: 24 }).map((_, h) => {
      const hData = hourStats.get(h);
      return {
        hour: h,
        engagementRate: hData ? parseFloat((hData.sumER / hData.count).toFixed(2)) : 0,
      };
    });

    // Format daily response (0 to 6)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyEngagement = Array.from({ length: 7 }).map((_, d) => {
      const dData = dayStats.get(d);
      return {
        day: d,
        dayName: dayNames[d],
        engagementRate: dData ? parseFloat((dData.sumER / dData.count).toFixed(2)) : 0,
      };
    });

    // Format media types comparison
    const contentTypes = ['REEL', 'IMAGE', 'VIDEO', 'CAROUSEL'];
    const contentTypeComparison = contentTypes.map(type => {
      const tData = typeStats.get(type);
      return {
        type,
        avgEngagementRate: tData ? parseFloat((tData.sumER / tData.count).toFixed(2)) : 0,
        count: tData ? tData.count : 0,
      };
    });

    // Format topic comparison
    const topicsList = ['AI', 'Startup', 'Tech', 'Marketing', 'Lifestyle', 'General'];
    const topicPerformance = topicsList.map(topic => {
      const topData = topicStats.get(topic);
      return {
        topic,
        avgEngagementRate: topData ? parseFloat((topData.sumER / topData.count).toFixed(2)) : 0,
        count: topData ? topData.count : 0,
      };
    }).filter(t => t.count > 0);

    // Format monthly growth sorted by date
    const monthlyGrowth = Array.from(monthStats.entries()).map(([month, vals]) => {
      return {
        month,
        impressions: vals.impressions,
        reach: vals.reach,
        posts: vals.count,
      };
    }).reverse(); // Latest at the end for line charting

    const avgEngagementRate = totalImpressions > 0 
      ? parseFloat(((totalLikes + totalComments + totalShares) / totalImpressions * 100).toFixed(2)) 
      : 0;

    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalShares,
      totalImpressions,
      totalReach,
      avgEngagementRate,
      bestPostingHour,
      bestPostingHourScore: parseFloat(bestPostingHourScore.toFixed(2)),
      lowestPostingHour,
      lowestPostingHourScore: parseFloat(lowestPostingHourScore.toFixed(2)),
      bestPostingDay,
      bestPostingDayScore: parseFloat(bestPostingDayScore.toFixed(2)),
      contentTypeComparison,
      hourlyEngagement,
      dailyEngagement,
      monthlyGrowth,
      topicPerformance,
    };
  }

  private static emptyAnalytics(): SocialAnalyticsResult {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalImpressions: 0,
      totalReach: 0,
      avgEngagementRate: 0,
      bestPostingHour: 9,
      bestPostingHourScore: 0,
      lowestPostingHour: 20,
      lowestPostingHourScore: 0,
      bestPostingDay: 4,
      bestPostingDayScore: 0,
      contentTypeComparison: [
        { type: 'REEL', avgEngagementRate: 0, count: 0 },
        { type: 'IMAGE', avgEngagementRate: 0, count: 0 },
        { type: 'VIDEO', avgEngagementRate: 0, count: 0 },
        { type: 'CAROUSEL', avgEngagementRate: 0, count: 0 },
      ],
      hourlyEngagement: Array.from({ length: 24 }).map((_, h) => ({ hour: h, engagementRate: 0 })),
      dailyEngagement: Array.from({ length: 7 }).map((_, d) => ({ day: d, dayName: dayNames[d], engagementRate: 0 })),
      monthlyGrowth: [],
      topicPerformance: [],
    };
  }
}
