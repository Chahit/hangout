import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  // Debug logging
  console.log('Auth callback received:', requestUrl.toString());
  console.log('Code present:', !!code);

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/auth?error=no_code', siteUrl));
  }

  try {
    // Create Supabase client with cookie store
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    }, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    // Get the code verifier cookie
    const pkceVerifier = cookieStore.get('supabase-code-verifier')?.value;
    if (!pkceVerifier) {
      console.error('No PKCE verifier found in cookies');
      return NextResponse.redirect(new URL('/auth?error=invalid_pkce', siteUrl));
    }

    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session Error:', sessionError.message);
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl));
    }

    if (!session?.user) {
      console.error('No session or user after exchange');
      return NextResponse.redirect(new URL('/auth?error=no_session', siteUrl));
    }

    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // If no profile exists, redirect to onboarding
    if (!profile) {
      console.log('No profile found, redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', siteUrl));
    }

    // If profile exists, redirect to dashboard
    console.log('Profile found, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', siteUrl));

  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(new URL('/auth?error=callback_error', siteUrl));
  }
} 