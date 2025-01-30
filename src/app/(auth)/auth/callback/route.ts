import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Get the site URL from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(
      `${siteUrl}/auth?error=${encodeURIComponent(
        'No code provided in callback'
      )}`
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    if (!session?.user?.email?.endsWith('@snu.edu.in')) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${siteUrl}/auth?error=${encodeURIComponent(
          'Only @snu.edu.in email addresses are allowed'
        )}`
      );
    }

    // Check if user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // Generate a base username from email
      const baseUsername = session.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check for username availability and generate a unique one
      let username = baseUsername;
      let counter = 1;
      let usernameAvailable = false;

      while (!usernameAvailable) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();

        if (!existingUser) {
          usernameAvailable = true;
        } else {
          username = `${baseUsername}${counter}`;
          counter++;
        }
      }

      // Create profile with the generated username
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          username: username,
          name: session.user.user_metadata.full_name || session.user.email.split('@')[0]
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return NextResponse.redirect(
          `${siteUrl}/auth?error=${encodeURIComponent(
            'Error creating user profile'
          )}`
        );
      }

      // Redirect new users to onboarding
      return NextResponse.redirect(`${siteUrl}/onboarding`);
    }

    // For existing users, check if they need to complete onboarding
    if (!profile.batch || !profile.branch) {
      return NextResponse.redirect(`${siteUrl}/onboarding`);
    }

    return NextResponse.redirect(`${siteUrl}${next}`);
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      `${siteUrl}/auth?error=${encodeURIComponent(
        'An error occurred during sign in'
      )}`
    );
  }
}