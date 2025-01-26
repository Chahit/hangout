import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email?.endsWith('@snu.edu.in')) {
      return NextResponse.json(
        { error: 'Please use your SNU email address' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Send magic link using Supabase Auth
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      }
    });

    if (signInError) {
      console.error('Error sending magic link:', signInError);
      return NextResponse.json(
        { error: 'Failed to send login link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Check your email for the login link',
      email 
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 