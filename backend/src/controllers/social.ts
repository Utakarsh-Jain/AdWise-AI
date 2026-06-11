import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../db';
import { SocialSyncService } from '../services/socialSync';

/**
 * Returns a redirect URL representing real OAuth authorization consent.
 * Redirects to Facebook/Instagram or LinkedIn OAuth endpoints.
 */
export async function getAuthUrl(req: AuthRequest, res: Response) {
  try {
    const platform = req.query.platform as string;

    if (!platform || !['instagram', 'facebook', 'linkedin'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform (instagram, facebook, or linkedin) is required.' });
    }

    const redirectUri = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/dashboard/accounts/callback';
    const state = Math.random().toString(36).substring(2, 15); // CSRF protection

    let authUrl = '';

    if (platform === 'instagram' || platform === 'facebook') {
      let appId = process.env.FACEBOOK_APP_ID;
      
      // Use Instagram-specific app ID if provided
      if (platform === 'instagram') {
        appId = process.env.INSTAGRAM_APP_ID || appId;
      }
      
      if (!appId) {
        return res.status(500).json({ error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} App ID not configured. Please contact support.` });
      }
      
      const scope = 'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts';
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;
    } else if (platform === 'linkedin') {
      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
      if (!linkedinClientId) {
        return res.status(500).json({ error: 'LinkedIn Client ID not configured. Please contact support.' });
      }
      
      const scope = 'r_liteprofile,w_member_social,r_organization_social';
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
    }

    return res.json({ url: authUrl, state });
  } catch (error: any) {
    console.error('Get Auth URL Error:', error);
    return res.status(500).json({ error: 'Server error generating authorization URL.' });
  }
}

/**
 * Exchanges the authorization code for real credentials and user profile.
 * Saves the account and does an initial sync.
 */
export async function handleCallback(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { platform, code } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!platform || !code) {
      return res.status(400).json({ error: 'Platform and authorization code are required.' });
    }

    let username = '';
    let platformUserId = '';
    let accessToken = '';
    let refreshToken = '';

    if (platform === 'instagram' || platform === 'facebook') {
      // Exchange code for access token using Facebook/Instagram API
      let appId = process.env.FACEBOOK_APP_ID;
      let appSecret = process.env.FACEBOOK_APP_SECRET;
      
      // Use Instagram-specific credentials if provided
      if (platform === 'instagram') {
        appId = process.env.INSTAGRAM_APP_ID || appId;
        appSecret = process.env.INSTAGRAM_APP_SECRET || appSecret;
      }
      
      const redirectUri = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/dashboard/accounts/callback';

      if (!appId || !appSecret) {
        return res.status(500).json({ error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} credentials not configured.` });
      }

      try {
        // Step 1: Get long-lived user access token
        const tokenUrl = `https://graph.instagram.com/v18.0/oauth/access_token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code');
        }

        const tokenData: any = await tokenResponse.json();
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || '';

        // Step 2: Get user profile
        const userProfileUrl = `https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${accessToken}`;
        const profileResponse = await fetch(userProfileUrl);
        const profileData: any = await profileResponse.json();

        username = profileData.username || 'Unknown User';
        platformUserId = profileData.id;

        if (!platformUserId) {
          throw new Error('Could not retrieve user ID from OAuth provider');
        }
      } catch (oauthError: any) {
        console.error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth Error:`, oauthError);
        return res.status(400).json({ error: `Failed to authenticate with ${platform}: ${oauthError.message}` });
      }
    } else if (platform === 'linkedin') {
      // Exchange code for access token using LinkedIn API
      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
      const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const redirectUri = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/dashboard/accounts/callback';

      if (!linkedinClientId || !linkedinClientSecret) {
        return res.status(500).json({ error: 'LinkedIn credentials not configured.' });
      }

      try {
        // Step 1: Exchange code for access token
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: linkedinClientId,
            client_secret: linkedinClientSecret,
            redirect_uri: redirectUri,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code');
        }

        const tokenData: any = await tokenResponse.json();
        accessToken = tokenData.access_token;

        // Step 2: Get user profile
        const profileUrl = 'https://api.linkedin.com/v2/me';
        const profileResponse = await fetch(profileUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profileData: any = await profileResponse.json();

        platformUserId = profileData.id;
        username = `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim() || 'LinkedIn User';

        if (!platformUserId) {
          throw new Error('Could not retrieve user ID from OAuth provider');
        }
      } catch (oauthError: any) {
        console.error('LinkedIn OAuth Error:', oauthError);
        return res.status(400).json({ error: `Failed to authenticate with LinkedIn: ${oauthError.message}` });
      }
    } else {
      return res.status(400).json({ error: 'Invalid platform.' });
    }

    // Upsert the social account with real credentials
    const account = await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform,
          platformUserId,
        },
      },
      update: {
        username,
        accessToken,
        refreshToken,
        updatedAt: new Date(),
      },
      create: {
        userId,
        platform,
        platformUserId,
        username,
        accessToken,
        refreshToken,
      },
    });

    // Run initial sync in the background
    console.log(`🚀 Initializing sync for newly connected ${platform} account: ${username}`);
    const syncedCount = await SocialSyncService.syncAccount(userId, platform, platformUserId);
    console.log(`Synced ${syncedCount} initial posts for ${username}`);

    return res.status(201).json({
      message: 'Account connected successfully!',
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        connectedAt: account.connectedAt,
      },
      syncedPosts: syncedCount,
    });
  } catch (error: any) {
    console.error('Social OAuth Callback Error:', error);
    return res.status(500).json({ error: 'Server error during account authorization.' });
  }
}

/**
 * Retrieves all connected social accounts for the user.
 */
export async function getAccounts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
      select: {
        id: true,
        platform: true,
        platformUserId: true,
        username: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    return res.json(accounts);
  } catch (error: any) {
    console.error('Get Accounts Error:', error);
    return res.status(500).json({ error: 'Server error retrieving social accounts.' });
  }
}

/**
 * Disconnects an account and purges its cached posts from the DB.
 */
export async function disconnectAccount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const account = await prisma.socialAccount.findFirst({
      where: { id, userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Social account not found.' });
    }

    // Delete social account
    await prisma.socialAccount.delete({
      where: { id: account.id },
    });

    // Delete all posts synced from this specific platform for this user
    const deletePostsResult = await prisma.post.deleteMany({
      where: {
        userId,
        platform: account.platform,
      },
    });

    console.log(`Deleted social account ${account.platform} for user ${userId}. Purged ${deletePostsResult.count} posts.`);

    return res.json({
      message: 'Account disconnected and post data purged successfully.',
      disconnectedPlatform: account.platform,
    });
  } catch (error: any) {
    console.error('Disconnect Account Error:', error);
    return res.status(500).json({ error: 'Server error disconnecting social account.' });
  }
}

/**
 * Manually triggers a post sync for a connected account.
 */
export async function manualSync(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { platform, platformUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!platform || !platformUserId) {
      return res.status(400).json({ error: 'Platform and platform user ID are required.' });
    }

    const count = await SocialSyncService.syncAccount(userId, platform, platformUserId);

    return res.json({
      message: 'Synchronization completed successfully.',
      syncedPosts: count,
    });
  } catch (error: any) {
    console.error('Manual Sync Error:', error);
    return res.status(500).json({ error: 'Server error syncing social account.' });
  }
}
