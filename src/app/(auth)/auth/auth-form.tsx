'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthError } from '@supabase/supabase-js';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  // Handle error from callback
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      setError(decodeURIComponent(error));
    }
  }, [searchParams]);

  const validateEmail = (email: string) => {
    return email.toLowerCase().endsWith('@snu.edu.in');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Please use your SNU email (@snu.edu.in)');
      setLoading(false);
      return;
    }

    try {
      // Always try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If user doesn't exist, try to sign up
        if (signInError.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                email_domain: 'snu.edu.in'
              }
            },
          });

          if (signUpError) throw signUpError;
          setSuccess('Please check your email for the verification link.');
        } else {
          throw signInError;
        }
      } else {
        // Successful sign in
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof AuthError ? error.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 rounded-lg p-4 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="your.name@snu.edu.in"
          />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Password (min 6 characters)"
            minLength={6}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white ${
          loading
            ? 'bg-purple-500/50 cursor-not-allowed'
            : 'bg-purple-500 hover:bg-purple-600'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
      >
        {loading ? 'Please wait...' : 'Sign in / Sign up'}
      </button>
    </form>
  );
} 