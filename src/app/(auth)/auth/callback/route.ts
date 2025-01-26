import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

    // Enhanced debug logging
    console.log('Full request URL:', request.url);
    console.log('Search params:', Object.fromEntries(requestUrl.searchParams));
    console.log('Headers:', Object.fromEntries(request.headers));

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(new URL('/auth?error=no_code', siteUrl));
    }

    // Create a Supabase client with the cookies
    const cookieStore = cookies();
    console.log('Available cookies:', cookieStore.getAll().map(c => c.name));

    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });

    // Exchange the code for a session
    console.log('Attempting to exchange code for session...');
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session Error:', sessionError.message, sessionError);
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl));
    }

    if (!session?.user) {
      console.error('No session or user after exchange');
      return NextResponse.redirect(new URL('/auth?error=no_session', siteUrl));
    }

    console.log('Session exchange successful, user ID:', session.user.id);

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile Error:', profileError.message);
      return NextResponse.redirect(new URL('/auth?error=profile_error', siteUrl));
    }

    // Create response with redirect
    const redirectUrl = new URL(profile ? '/dashboard' : '/onboarding', siteUrl);
    console.log('Redirecting to:', redirectUrl.toString());
    
    const response = NextResponse.redirect(redirectUrl);

    // Log all cookies being set
    console.log('Cookies in response:', response.headers.get('set-cookie'));

    return response;

  } catch (error) {
    console.error('Callback error:', error);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/auth?error=callback_error', siteUrl));
  }
} 