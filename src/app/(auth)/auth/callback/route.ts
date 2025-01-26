import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Add no-cache headers
  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Pragma': 'no-cache'
  });

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Get the site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  
  console.log('Auth Callback Debug:');
  console.log('- Request URL:', request.url);
  console.log('- Code present:', !!code);
  console.log('- Site URL:', siteUrl);

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('- Attempting to exchange code for session...');
    const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError.message);
      console.error('Error details:', sessionError);
      return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
    }
    
    console.log('- Session exchange successful:', !!session);
    console.log('- User ID:', session?.user?.id);

    // Check if user has completed onboarding
    console.log('- Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      console.error('Error details:', profileError);
    }
    
    console.log('- Profile exists:', !!profile);

    // If no profile exists, redirect to onboarding
    if (!profile) {
      console.log('- Redirecting to onboarding...');
      return NextResponse.redirect(new URL('/onboarding', siteUrl), { headers });
    }

    // If profile exists, redirect to dashboard
    console.log('- Redirecting to dashboard...');
    return NextResponse.redirect(new URL('/dashboard', siteUrl), { headers });
  } catch (error) {
    console.error('Unexpected error in callback:', error);
    return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
  }
} 