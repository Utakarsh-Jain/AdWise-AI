'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`OAuth Error: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from provider.');
          return;
        }

        // Determine platform from stored state
        let platform: 'instagram' | 'facebook' | 'linkedin' | null = null;
        
        for (const p of ['instagram', 'facebook', 'linkedin'] as const) {
          const storedState = sessionStorage.getItem(`oauth_state_${p}`);
          if (storedState === state) {
            platform = p;
            sessionStorage.removeItem(`oauth_state_${p}`);
            break;
          }
        }

        if (!platform) {
          setStatus('error');
          setMessage('Unable to determine which platform to connect.');
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage('Authentication required. Please sign in again.');
          return;
        }

        // Exchange code for real credentials on backend
        const res = await fetch(`${API_BASE_URL}/social/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform,
            code,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setMessage(data.error || 'Failed to connect account.');
          return;
        }

        setStatus('success');
        setMessage(`Successfully connected ${platform.toUpperCase()} account: ${data.account.username}`);

        // Redirect to accounts page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/accounts');
        }, 2000);
      } catch (err: any) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Error processing OAuth callback.');
      }
    };

    handleCallback();
  }, [searchParams, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-indigo-400 animate-spin" />
            <h2 className="text-lg font-semibold text-slate-100">{message}</h2>
            <p className="text-sm text-slate-400">Please wait while we complete your authorization...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-400" />
            <h2 className="text-lg font-semibold text-slate-100">Connection Successful! 🎉</h2>
            <p className="text-sm text-slate-400">{message}</p>
            <p className="text-xs text-slate-500 mt-4">Redirecting to accounts page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
            <h2 className="text-lg font-semibold text-slate-100">Connection Failed</h2>
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => router.push('/dashboard/accounts')}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Back to Accounts
            </button>
          </>
        )}
      </div>
    </div>
  );
}
