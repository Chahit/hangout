import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  
  // Get the site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  
  // Prevent redirect loops
  if (requestUrl.pathname === '/auth' && !code) {
    console.error('Preventing redirect loop - no code present');
    return NextResponse.redirect(new URL('/auth', siteUrl));
  }

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/auth', siteUrl));
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session Error:', {
        message: sessionError.message,
        status: sessionError.status
      });
      // Add the error as a query parameter for debugging
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl));
    }

    if (!session) {
      console.error('No session created');
      return NextResponse.redirect(new URL('/auth?error=no_session', siteUrl));
    }

    console.log('Session created for user:', session.user.email);

    // Check if user has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile Error:', profileError.message);
      // If there's a database error, still proceed but log it
      return NextResponse.redirect(new URL('/onboarding', siteUrl));
    }

    if (!profile) {
      console.log('No profile found - redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', siteUrl));
    }

    console.log('Profile exists - redirecting to dashboard');
    return NextResponse.redirect(new URL(next, siteUrl));
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.redirect(new URL('/auth?error=unexpected', siteUrl));
  }
} 