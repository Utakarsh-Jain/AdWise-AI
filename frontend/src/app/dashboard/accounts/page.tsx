'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  Calendar,
  User
} from 'lucide-react';

// Inline SVG platform icons (lucide-react v1.x doesn't include these)
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

interface SocialAccount {
  id: string;
  platform: string;
  platformUserId: string;
  username: string;
  connectedAt: string;
  updatedAt: string;
}

export default function ConnectAccounts() {
  const { token } = useAuth();
  const { theme } = useTheme();
  
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Connection flow states
  const [showOauthModal, setShowOauthModal] = useState(false);
  const [oauthPlatform, setOauthPlatform] = useState<'instagram' | 'facebook' | 'linkedin' | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);

  // Fetch linked accounts
  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/social/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch social accounts.');
      setAccounts(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading social accounts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Initiate OAuth flow - redirect to provider
  const handleConnectClick = async (platform: 'instagram' | 'facebook' | 'linkedin') => {
    if (!token) return;
    
    try {
      setConnecting(true);
      setError(null);
      
      // Get the OAuth URL from backend
      const res = await fetch(`${API_BASE_URL}/social/auth-url?platform=${platform}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get authorization URL.');
      
      // Store state in sessionStorage for CSRF verification
      if (data.state) {
        sessionStorage.setItem(`oauth_state_${platform}`, data.state);
      }
      
      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error initiating OAuth flow.');
      setConnecting(false);
    }
  };

  // Complete OAuth flow with real authorization code
  const completeConnection = async (platform: 'instagram' | 'facebook' | 'linkedin', code: string) => {
    if (!token) return;
    
    try {
      setConnecting(true);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/social/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          code, // Real authorization code from OAuth provider
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to authorize account.');

      setSuccess(`Successfully connected your ${platform.toUpperCase()} account and synced ${data.syncedPosts} posts!`);
      setShowOauthModal(false);
      setOauthPlatform(null);
      await fetchAccounts();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error connecting account.');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect account
  const handleDisconnect = async (id: string, platform: string) => {
    if (!token || !confirm(`Are you sure you want to disconnect this ${platform.toUpperCase()} account? All synced post data will be deleted.`)) return;

    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/social/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect account.');

      setSuccess(`Disconnected ${platform.toUpperCase()} account successfully.`);
      await fetchAccounts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error disconnecting account.');
    }
  };

  // Manual Sync trigger
  const handleManualSync = async (platform: string, platformUserId: string) => {
    if (!token) return;

    try {
      setSyncingPlatform(platform);
      setError(null);
      
      const res = await fetch(`${API_BASE_URL}/social/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform, platformUserId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to synchronize posts.');

      setSuccess(`Synced ${data.syncedPosts} posts for ${platform.toUpperCase()}!`);
      await fetchAccounts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error during synchronization.');
    } finally {
      setSyncingPlatform(null);
    }
  };

  // Check if platform is connected
  const getConnectedAccount = (platform: string) => {
    return accounts.find(acc => acc.platform === platform);
  };

  // Platform information structures
  const platformConfig = [
    {
      key: 'instagram',
      name: 'Instagram',
      subtitle: 'Instagram Graph API',
      icon: InstagramIcon,
      color: 'from-pink-500 via-purple-500 to-indigo-500',
      description: 'Fetch Reels, Image Posts, Carousels, Likes, Comments, Shares, and Impressions for business/creator profiles.',
      permissions: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement'],
    },
    {
      key: 'facebook',
      name: 'Facebook',
      subtitle: 'Graph API',
      icon: FacebookIcon,
      color: 'from-blue-600 to-blue-800',
      description: 'Sync page posts, image distributions, audience impressions, comments, shares, and reach stats.',
      permissions: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      subtitle: 'OAuth 2.0 API',
      icon: LinkedinIcon,
      color: 'from-cyan-600 to-blue-700',
      description: 'Monitor post articles, interactions, clicks, shares, and growth patterns for individual and company pages.',
      permissions: ['r_liteprofile', 'w_member_social', 'r_organization_social'],
    },
  ];

  return (
    <div className="space-y-8 z-10 relative">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5 transition-colors">
          <Link2 className="w-8 h-8 text-indigo-500" /> Connect Accounts
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1 transition-colors">
          Securely link your social media profiles to enable automatic post synchronization and AI metrics auditing.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Authorization Alert</h4>
            <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-emerald-300">Connection Successful</h4>
            <p className="text-xs text-emerald-400/90 mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {platformConfig.map(platform => {
          const connected = getConnectedAccount(platform.key);
          const PlatformIcon = platform.icon;
          const isSyncing = syncingPlatform === platform.key;

          return (
            <div 
              key={platform.key} 
              className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-md dark:shadow-none hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
            >
              {/* Decorative top border gradient line */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${platform.color}`} />
              
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">
                      {platform.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                      {platform.subtitle}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${platform.color} text-white shadow-lg shadow-indigo-500/5 group-hover:scale-110 transition-transform duration-300`}>
                    <PlatformIcon className="w-5 h-5" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6 transition-colors">
                  {platform.description}
                </p>

                {/* Permissions badge stack */}
                <div className="space-y-2 mb-6">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Scope Permissions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {platform.permissions.map(perm => (
                      <span key={perm} className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status & Actions Footer */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-900 mt-auto">
                {connected ? (
                  <div className="space-y-4">
                    {/* Username & Connection Info */}
                    <div className="bg-emerald-50 dark:bg-slate-950/60 border border-emerald-200 dark:border-slate-800/60 rounded-2xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-300 truncate">
                            {connected.username}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/20 shrink-0">
                          ✓ Connected
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-600 dark:text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Last synced: {new Date(connected.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleManualSync(platform.key, connected.platformUserId)}
                        disabled={isSyncing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40 hover:bg-indigo-50 dark:hover:bg-slate-900/80 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Sync Now
                      </button>
                      <button
                        onClick={() => handleDisconnect(connected.id, platform.key)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-rose-300 dark:border-rose-500/30 hover:border-rose-400 dark:hover:border-rose-500/50 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Unlink
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectClick(platform.key as any)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect {platform.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated OAuth Consent Popup Modal */}
      {showOauthModal && oauthPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative transition-all">
            {/* Header branding */}
            <div className="bg-indigo-600 p-6 text-white flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-none">Security Authorization</h3>
                <span className="text-xs text-indigo-100">AdWise API OAuth Integration</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Link2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Authorize access to {oauthPlatform.toUpperCase()}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  AdWise AI wants access to your connected {oauthPlatform.toUpperCase()} Business Pages, media logs, metrics insights, and audience reach logs.
                </p>
              </div>

              {/* Permission Scopes checkmark list */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wider">Approved Permissions</p>
                <ul className="space-y-2.5 text-xs text-slate-800 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Read public profile and content posts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Retrieve historical comments and likes counts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Access reach, impressions and shares metrics</span>
                  </li>
                </ul>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-500 leading-normal flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>By approving, you authorize secure token storage. Tokens auto-refresh when expired. No passwords will be shared.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-900 flex gap-3">
              <button
                onClick={() => {
                  setShowOauthModal(false);
                  setOauthPlatform(null);
                }}
                disabled={connecting}
                className="flex-1 py-2.5 px-4 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={completeConnection}
                disabled={connecting}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-600/20 disabled:opacity-60"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Approve & Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
