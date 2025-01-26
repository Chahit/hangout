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
  
  // More detailed logging
  console.log('=== Auth Callback Debug ===');
  console.log('Request details:');
  console.log('- URL:', request.url);
  console.log('- Code:', code?.substring(0, 10) + '...');
  console.log('- Site URL:', siteUrl);
  console.log('- Headers:', Object.fromEntries(request.headers));

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
  }

  try {
    console.log('Creating Supabase client...');
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    console.log('Exchanging code for session...');
    const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session Error:', {
        message: sessionError.message,
        status: sessionError.status,
        name: sessionError.name
      });
      return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
    }
    
    console.log('Session created successfully');
    console.log('- User:', session?.user?.email);

    // Check if user has completed onboarding
    console.log('Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .single();

    if (profileError) {
      console.error('Profile Error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details
      });
    }
    
    console.log('Profile check complete:', !!profile);

    // If no profile exists, redirect to onboarding
    if (!profile) {
      console.log('No profile found - redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', siteUrl), { headers });
    }

    // If profile exists, redirect to dashboard
    console.log('Profile exists - redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', siteUrl), { headers });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.redirect(new URL('/auth', siteUrl), { headers });
  }
} 