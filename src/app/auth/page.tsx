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
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-[#020817]">
      {/* Purple gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-transparent" />
      
      <div className="relative w-full max-w-md space-y-12">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-white font-clash-display">
            Welcome to SNU Hangout
          </h1>
          <p className="text-lg text-gray-400">
            Sign in with your SNU email
          </p>
        </div>

        <div className="space-y-8">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 px-6 py-4 rounded-xl border-2 border-purple-500/20 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 font-medium text-lg"
          >
            <Image
              src="/google.svg"
              alt="Google"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            Sign in with Google
          </button>

          {error && (
            <p className="text-sm text-red-500 text-center font-medium">
              {decodeURIComponent(error)}
            </p>
          )}

          <p className="text-sm text-gray-500 text-center">
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