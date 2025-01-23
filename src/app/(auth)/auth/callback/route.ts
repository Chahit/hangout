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

    // If no profile exists, redirect to onboarding
    if (!profile) {
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
    }
  }

  // If profile exists, redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
} 