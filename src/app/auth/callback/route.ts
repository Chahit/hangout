import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Always use the site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  
  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .single();

      // Redirect to onboarding if no profile, otherwise dashboard
      const redirectTo = profile ? '/dashboard' : '/onboarding';
      return NextResponse.redirect(new URL(redirectTo, siteUrl));
      
    } catch (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(new URL('/auth?error=auth_error', siteUrl));
    }
  }

  // No code - redirect to auth page
  return NextResponse.redirect(new URL('/auth', siteUrl));
} 