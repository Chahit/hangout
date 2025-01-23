import Ably from "ably";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the user session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = new Ably.Realtime(process.env.ABLY_API_KEY!);
    const tokenRequestData = await new Promise((resolve, reject) => {
      client.auth.createTokenRequest({
        clientId: session.user.id,
        capability: {
          [`group-*`]: ['publish', 'subscribe', 'presence']
        }
      }, (err, tokenRequest) => {
        if (err) reject(err);
        resolve(tokenRequest);
      });
    });

    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error getting Ably token:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 