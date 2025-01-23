import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id,
        name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Anonymous',
        email: session.user.email,
        batch: '',
        branch: '',
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating profile:', error);
      }
    }
  }

  // Auth routes that should be accessible without session
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = req.nextUrl.pathname === "/";

  // If user is signed in and on the landing page, redirect to dashboard
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is not signed in and trying to access protected route
  if (!session && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // If user is signed in and trying to access auth routes
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 