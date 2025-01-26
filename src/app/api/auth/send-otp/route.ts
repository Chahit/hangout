import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    // Validate email
    if (!email?.endsWith('@snu.edu.in')) {
      return NextResponse.json(
        { error: 'Please use your SNU email address.' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });

    if (error) {
      console.error('Error sending magic link:', error.message);
      return NextResponse.json(
        { error: 'Failed to send login link. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Check your email for the login link!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 