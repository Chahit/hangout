import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    console.log('Test email route called');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Defined' : 'Not defined');

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: 'Test Email',
      html: '<p>This is a test email to verify Resend configuration.</p>'
    });

    console.log('Resend Response:', { data, error });

    return NextResponse.json({
      success: true,
      data,
      error
    });
  } catch (error) {
    console.error('Test Email Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 