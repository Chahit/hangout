import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email?.endsWith('@snu.edu.in')) {
      return NextResponse.json(
        { error: 'Please use your SNU email address' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in Supabase with expiration
    const supabase = createRouteHandlerClient({ cookies });
    const { error: storeError } = await supabase
      .from('email_otps')
      .insert({
        email,
        otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes expiry
      });

    if (storeError) {
      console.error('Error storing OTP:', storeError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send email with OTP using Resend
    try {
      await resend.emails.send({
        from: 'SNU Hangout <noreply@snuhangout.tech>',
        to: email,
        subject: 'Your SNU Hangout Login Code',
        html: `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff; border-radius: 12px;">
            <h1 style="color: #fff; font-size: 24px; margin-bottom: 24px; text-align: center;">Welcome to SNU Hangout</h1>
            <p style="color: #a3a3a3; margin-bottom: 24px; text-align: center;">Here's your login code:</p>
            <div style="background: linear-gradient(to right, #9333ea, #ec4899); padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin-bottom: 24px;">
              ${otp}
            </div>
            <p style="color: #a3a3a3; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
            <p style="color: #a3a3a3; font-size: 14px; text-align: center;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 