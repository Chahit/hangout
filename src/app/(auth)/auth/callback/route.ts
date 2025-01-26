import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);

    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .single();

    // Get the site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

    // If no profile exists, redirect to onboarding
    if (!profile) {
      return NextResponse.redirect(new URL('/onboarding', siteUrl));
    }

    // If profile exists, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', siteUrl));
  }

  // If no code, redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin));
} 