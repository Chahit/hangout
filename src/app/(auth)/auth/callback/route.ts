import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

    // Log incoming request details for debugging
    console.log('Auth Callback - Request Details:', {
      url: request.url,
      code: code ? 'present' : 'missing',
      error,
      error_description,
      next,
      origin: requestUrl.origin,
      siteUrl
    });

    // Handle any error parameters first
    if (error) {
      console.error('Auth error from provider:', error, error_description);
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(error_description || error)}`, siteUrl)
      );
    }

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(new URL('/auth?error=missing_code', siteUrl));
    }

    // Create a Supabase client with the cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });

    // Exchange the code for a session
    console.log('Attempting to exchange code for session...');
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session exchange error:', {
        message: sessionError.message,
        status: sessionError.status,
        name: sessionError.name
      });
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(sessionError.message)}`, siteUrl)
      );
    }

    if (!session) {
      console.error('No session returned after successful exchange');
      return NextResponse.redirect(new URL('/auth?error=no_session_data', siteUrl));
    }

    // Get user profile after successful authentication
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return NextResponse.redirect(
        new URL('/auth?error=profile_fetch_failed', siteUrl)
      );
    }

    // Determine redirect based on profile existence and next parameter
    const redirectUrl = profile ? next : '/onboarding';
    console.log('Authentication successful, redirecting to:', redirectUrl);
    
    return NextResponse.redirect(new URL(redirectUrl, siteUrl));

  } catch (error) {
    console.error('Unhandled callback error:', error);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL('/auth?error=unhandled_callback_error', siteUrl)
    );
  }
} 