import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    
    // Get the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(new URL('/auth', siteUrl));
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session Error:', sessionError.message);
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl)
      );
    }

    if (!session) {
      return NextResponse.redirect(new URL('/auth?error=no_session', siteUrl));
    }

    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Create response with session cookie
    const response = NextResponse.redirect(
      new URL(profile ? next : '/onboarding', siteUrl)
    );

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    // Get the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return NextResponse.redirect(
      new URL('/auth?error=callback_error', siteUrl)
    );
  }
} 