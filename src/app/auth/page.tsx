'use client';

import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-foreground font-clash-display">
            Welcome to SNU Hangout
          </h1>
          <p className="text-muted-foreground">
            Sign in with your SNU email
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-card hover:bg-card/80 text-card-foreground px-4 py-3 rounded-lg border border-border transition-colors"
          >
            <Image
              src="/google.svg"
              alt="Google"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            Sign in with Google
          </button>

          {error && (
            <p className="text-sm text-destructive text-center">
              {decodeURIComponent(error)}
            </p>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Only @snu.edu.in accounts are allowed
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthContent />
    </Suspense>
  );
} 