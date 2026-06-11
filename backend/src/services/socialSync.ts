import prisma from '../db';
import { Post, PostFeatures } from '@prisma/client';

export class SocialSyncService {
  /**
   * Triggers social synchronization for a specific user and platform.
   * Pulls posts, reels, metrics and parses features.
   */
  public static async syncAccount(userId: string, platform: string, platformUserId: string): Promise<number> {
    // 1. Check if token needs refresh
    await this.checkAndRefreshToken(userId, platform, platformUserId);

    // 2. Simulate API data retrieval from social graph APIs
    const mockPosts = this.generateMockPosts(userId, platform, platformUserId);

    // 3. Upsert posts and their features into the database
    let syncedCount = 0;
    for (const item of mockPosts) {
      // Upsert the Post
      const post = await prisma.post.upsert({
        where: {
          userId_platform_platformPostId: {
            userId,
            platform,
            platformPostId: item.platformPostId,
          },
        },
        update: {
          caption: item.caption,
          mediaType: item.mediaType,
          likes: item.likes,
          comments: item.comments,
          shares: item.shares,
          reach: item.reach,
          impressions: item.impressions,
          createdAt: item.createdAt,
        },
        create: {
          userId,
          platform,
          platformPostId: item.platformPostId,
          caption: item.caption,
          mediaType: item.mediaType,
          likes: item.likes,
          comments: item.comments,
          shares: item.shares,
          reach: item.reach,
          impressions: item.impressions,
          createdAt: item.createdAt,
        },
      });

      // Extract features for this post
      const features = this.extractFeatures(post.caption || '', post.createdAt);

      // Upsert PostFeatures
      await prisma.postFeatures.upsert({
        where: {
          postId: post.id,
        },
        update: {
          captionLength: features.captionLength,
          hashtagCount: features.hashtagCount,
          emojiCount: features.emojiCount,
          postingHour: features.postingHour,
          postingDay: features.postingDay,
          topic: features.topic,
        },
        create: {
          postId: post.id,
          captionLength: features.captionLength,
          hashtagCount: features.hashtagCount,
          emojiCount: features.emojiCount,
          postingHour: features.postingHour,
          postingDay: features.postingDay,
          topic: features.topic,
        },
      });

      syncedCount++;
    }

    // Update the SocialAccount's updatedAt timestamp
    await prisma.socialAccount.updateMany({
      where: { userId, platform, platformUserId },
      data: { updatedAt: new Date() },
    });

    return syncedCount;
  }

  /**
   * Refreshes expired tokens automatically based on connection time.
   * Standard access tokens last 60 days. If the account was updated more than 2 hours ago
   * in this mock environment (or 60 days in production), we update the token.
   */
  public static async checkAndRefreshToken(userId: string, platform: string, platformUserId: string): Promise<boolean> {
    const account = await prisma.socialAccount.findFirst({
      where: { userId, platform, platformUserId },
    });

    if (!account) return false;

    const tokenAgeMs = Date.now() - account.updatedAt.getTime();
    const refreshThresholdMs = 2 * 60 * 60 * 1000; // 2 hours for simulation, normally 55-60 days

    if (tokenAgeMs > refreshThresholdMs && account.refreshToken) {
      console.log(`🔄 Refreshing expired token for ${platform} account: ${account.username}`);
      const mockNewAccessToken = `refreshed_access_${platform}_${Math.random().toString(36).substring(2, 12)}`;
      const mockNewRefreshToken = `refreshed_refresh_${platform}_${Math.random().toString(36).substring(2, 12)}`;

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: mockNewAccessToken,
          refreshToken: mockNewRefreshToken,
          updatedAt: new Date(),
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Helper to count emojis in a string.
   */
  private static countEmojis(text: string): number {
    const emojiRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Helper to extract content features from the caption.
   */
  private static extractFeatures(caption: string, createdAt: Date) {
    const captionLength = caption.length;

    // Hashtags
    const hashtags = caption.match(/#[a-zA-Z0-9_]+/g) || [];
    const hashtagCount = hashtags.length;

    // Emojis
    const emojiCount = this.countEmojis(caption);

    // Posting time features
    const postingHour = createdAt.getHours();
    const postingDay = createdAt.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

    // Topic classification based on keywords
    let topic = 'General';
    const lowerCaption = caption.toLowerCase();
    if (lowerCaption.includes('ai') || lowerCaption.includes('artificial intelligence') || lowerCaption.includes('gpt') || lowerCaption.includes('gemini') || lowerCaption.includes('llm') || lowerCaption.includes('machine learning')) {
      topic = 'AI';
    } else if (lowerCaption.includes('startup') || lowerCaption.includes('founder') || lowerCaption.includes('venture') || lowerCaption.includes('funding') || lowerCaption.includes('incubator') || lowerCaption.includes('bootstrap')) {
      topic = 'Startup';
    } else if (lowerCaption.includes('tech') || lowerCaption.includes('software') || lowerCaption.includes('developer') || lowerCaption.includes('coding') || lowerCaption.includes('programming')) {
      topic = 'Tech';
    } else if (lowerCaption.includes('marketing') || lowerCaption.includes('growth') || lowerCaption.includes('campaign') || lowerCaption.includes('seo') || lowerCaption.includes('sales')) {
      topic = 'Marketing';
    } else if (lowerCaption.includes('lifestyle') || lowerCaption.includes('fitness') || lowerCaption.includes('travel') || lowerCaption.includes('food')) {
      topic = 'Lifestyle';
    }

    return {
      captionLength,
      hashtagCount,
      emojiCount,
      postingHour,
      postingDay,
      topic,
    };
  }

  /**
   * Generates mathematical correlations for mock post sync data:
   * 1. Thursday posts have 34% higher engagement.
   * 2. Reels generate 2.5x more engagement than images.
   * 3. Posting hours 8 AM - 10 AM perform best.
   * 4. AI topics outperform Startup topics (1.8x multiplier vs 0.9x).
   */
  private static generateMockPosts(userId: string, platform: string, platformUserId: string) {
    const mockPosts: Array<{
      platformPostId: string;
      caption: string;
      mediaType: string;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
      impressions: number;
      createdAt: Date;
    }> = [];

    // Let's create posts over the last 30 days
    const topics = [
      { category: 'AI', text: 'AI is changing the coding landscape! Check out our new LLM integrations. 🚀 #AI #Tech #Coding' },
      { category: 'AI', text: 'Building agents with Gemini is incredibly fun and efficient. ✨ #AI #Gemini #Developer' },
      { category: 'Startup', text: 'Startup hustle: Pitching to investors today. Wish us luck! 📈 #Startup #Founder #VC' },
      { category: 'Startup', text: 'Bootstrapping a startup is hard but rewarding. Here are 5 lessons. 💡 #Startup #Growth #Founder' },
      { category: 'Tech', text: 'Clean code vs fast code. What do you prefer? 💻 #Tech #Developer #Software' },
      { category: 'Marketing', text: 'Our latest ad campaign generated 4.5x ROI! Dynamic bidding rules rock. 📊 #Marketing #SEO #Growth' },
      { category: 'Lifestyle', text: 'Coffee first, code second. ☕ Happy coding! #Lifestyle #Office #Developer' },
    ];

    const mediaTypes = ['REEL', 'IMAGE', 'VIDEO', 'CAROUSEL'];

    // Generate 12 posts per platform
    for (let i = 0; i < 12; i++) {
      const postId = `post_${platform}_${platformUserId}_${i + 1}`;
      const topicItem = topics[i % topics.length];
      const mediaType = mediaTypes[i % mediaTypes.length];

      // Distribute dates over last 30 days
      const postDate = new Date();
      // Ensure we hit specific days of week:
      // i = 0, 7 => Thursday (Day 4)
      // i = 1, 8 => Friday (Day 5)
      // i = 2, 9 => Monday (Day 1)
      // etc.
      let daysAgo = i * 2.5 + 1;
      postDate.setDate(postDate.getDate() - daysAgo);

      // Distribute posting hours:
      // Let's ensure some are between 8-10 AM (e.g. 9 AM) and others are spread out
      let postingHour = 9;
      if (i % 3 === 1) postingHour = 15; // 3 PM
      if (i % 3 === 2) postingHour = 20; // 8 PM
      postDate.setHours(postingHour, 30, 0, 0);

      // Base engagement values
      let baseImpressions = 1000 + Math.round(Math.random() * 500);
      let baseLikes = 50 + Math.round(Math.random() * 20);
      let baseComments = 5 + Math.round(Math.random() * 5);
      let baseShares = 2 + Math.round(Math.random() * 3);

      // 1. Content Type Multipliers (Reels generate 2.5x more engagement than images)
      // Reels: 2.5x, Images: 1.0x, Videos: 1.5x, Carousels: 1.8x
      let typeMultiplier = 1.0;
      if (mediaType === 'REEL') typeMultiplier = 2.5;
      else if (mediaType === 'VIDEO') typeMultiplier = 1.5;
      else if (mediaType === 'CAROUSEL') typeMultiplier = 1.8;

      // 2. Day of Week Multipliers (Thursday posts receive 34% higher engagement)
      let dayMultiplier = 1.0;
      if (postDate.getDay() === 4) { // Thursday
        dayMultiplier = 1.34;
      } else if (postDate.getDay() === 0 || postDate.getDay() === 6) { // Weekends lower
        dayMultiplier = 0.8;
      }

      // 3. Hour of Day Multipliers (Posts between 8 AM and 10 AM perform best)
      let hourMultiplier = 1.0;
      if (postingHour >= 8 && postingHour <= 10) {
        hourMultiplier = 1.4;
      } else if (postingHour >= 18) { // Late night lower
        hourMultiplier = 0.85;
      }

      // 4. Topic Multipliers (AI outperforms Startup)
      let topicMultiplier = 1.0;
      if (topicItem.category === 'AI') {
        topicMultiplier = 1.8;
      } else if (topicItem.category === 'Startup') {
        topicMultiplier = 0.9;
      }

      // Calculate final metrics using multipliers
      const netMultiplier = typeMultiplier * dayMultiplier * hourMultiplier * topicMultiplier;
      
      const impressions = Math.round(baseImpressions * (netMultiplier * 0.8 + 0.2));
      const reach = Math.round(impressions * 0.85);
      const likes = Math.round(baseLikes * netMultiplier);
      const comments = Math.round(baseComments * netMultiplier);
      const shares = Math.round(baseShares * netMultiplier);

      mockPosts.push({
        platformPostId: postId,
        caption: topicItem.text,
        mediaType,
        likes,
        comments,
        shares,
        reach,
        impressions,
        createdAt: postDate,
      });
    }

    return mockPosts;
  }
}
