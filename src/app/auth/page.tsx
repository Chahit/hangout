'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Handle auth errors
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'no_code':
          setError('Authentication code missing. Please try again.');
          break;
        case 'no_session':
          setError('Unable to create session. Please try again.');
          break;
        case 'exchange_failed':
          setError('Failed to complete authentication. Please try again.');
          break;
        case 'callback_error':
          setError('Authentication process failed. Please try again.');
          break;
        default:
          setError(decodeURIComponent(errorParam));
      }
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!email.endsWith('@snu.edu.in')) {
        setError('Please use your SNU email address.');
        setLoading(false);
        return;
      }

      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
            SNU Hangout
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your campus, your community, your vibe
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3">
            <div className="flex">
              <div className="flex-1 text-sm text-destructive">{error}</div>
            </div>
          </div>
        )}

        {success ? (
          <div className="rounded-md bg-emerald-50 p-3">
            <div className="flex">
              <div className="flex-1 text-sm text-emerald-500">
                Check your email for the magic link!
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                SNU Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name.lastname@snu.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border p-2 bg-background"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 