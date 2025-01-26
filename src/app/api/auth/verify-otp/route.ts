import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Check if OTP exists and is valid
    const { data: otpData, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Delete used OTP
    await supabase
      .from('email_otps')
      .delete()
      .eq('email', email);

    // Create or get user
    const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (userError && userError.message !== 'User already registered') {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    // Return redirect path based on profile existence
    return NextResponse.json({
      redirectTo: profile ? '/dashboard' : '/onboarding'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
} 