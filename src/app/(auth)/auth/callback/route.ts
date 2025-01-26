import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Get the site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(new URL('/auth', siteUrl));
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError);
      return NextResponse.redirect(new URL('/auth', siteUrl));
    }

    // Check if user has completed onboarding
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // If no profile exists, redirect to onboarding
    if (!profile) {
      return NextResponse.redirect(new URL('/onboarding', siteUrl));
    }

    // If profile exists, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', siteUrl));
  } catch (error) {
    console.error('Unexpected error in callback:', error);
    return NextResponse.redirect(new URL('/auth', siteUrl));
  }
} 