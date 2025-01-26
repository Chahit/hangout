'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';

// Separate component that uses useSearchParams
function AuthContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  // Handle URL error parameters
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      switch(errorParam) {
        case 'no_code':
          setError('Authentication code missing. Please try again.');
          break;
        case 'no_session':
          setError('Session creation failed. Please try again.');
          break;
        case 'profile_error':
          setError('Error accessing user profile. Please try again.');
          break;
        case 'callback_error':
          setError('Authentication process failed. Please try again.');
          break;
        default:
          setError('Authentication failed. Please try again.');
      }
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!email.endsWith('@snu.edu.in')) {
        setError('Please use your SNU email address.');
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          shouldCreateUser: true,
        }
      });
      
      if (error) throw error;
      
      setSuccess('Check your email for the login link!');
      setEmail('');
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md space-y-8 p-6 rounded-xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text font-clash-display">
            SNU Hangout
          </h1>
          <p className="text-zinc-400">
            Your campus, your community, your vibe
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex">
              <div className="flex-1 text-sm text-red-400">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
            <div className="flex">
              <div className="flex-1 text-sm text-green-400">{success}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-zinc-300">
              SNU Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name.lastname@snu.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 p-3 bg-zinc-900/50 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Login Link'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
} 