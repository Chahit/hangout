'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { Sparkles, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Floating background shapes component
const FloatingShapes = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <motion.div
      className="absolute w-72 h-72 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '10%', left: '20%' }}
    />
    <motion.div
      className="absolute w-96 h-96 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, -70, 0],
        y: [0, 100, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{ top: '40%', right: '10%' }}
    />
  </div>
);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in
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
          <form onSubmit={handleSignIn}>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <input
                  type="email"
                  placeholder="name.lastname@snu.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border p-2"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-md bg-primary p-2 text-white ${
                  loading ? 'opacity-50' : ''
                }`}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 