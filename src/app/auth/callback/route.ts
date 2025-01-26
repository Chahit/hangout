import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    
    // Always use the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
    
    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(new URL('/auth?error=no_code', siteUrl));
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Log cookies for debugging
    console.log('Cookies present:', cookieStore.getAll().map(c => c.name).join(', '));
    
    try {
      // Exchange the code for a session
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Session Error:', sessionError.message);
        return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl));
      }

      if (!session) {
        console.error('No session after exchange');
        return NextResponse.redirect(new URL('/auth?error=no_session', siteUrl));
      }

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile Error:', profileError.message);
      }

      // Create response with redirect
      const response = NextResponse.redirect(
        new URL(profile ? next : '/onboarding', siteUrl)
      );

      return response;

    } catch (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(new URL('/auth?error=exchange_failed', siteUrl));
    }
  } catch (error) {
    console.error('Callback error:', error);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hangout-production.up.railway.app';
    return NextResponse.redirect(new URL('/auth?error=callback_error', siteUrl));
  }
} 