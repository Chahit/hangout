import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Auth routes that should be accessible without session
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = req.nextUrl.pathname === "/";
  const isOnboardingRoute = req.nextUrl.pathname === "/onboarding";

  if (session?.user) {
    // Check if profile exists and is complete
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, batch, branch, username')
      .eq('id', session.user.id)
      .single();

    // If no profile exists or profile is incomplete, redirect to onboarding
    // unless they're already on the onboarding page
    if ((!profile || !profile.batch || !profile.branch || !profile.username) && !isOnboardingRoute) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  // If user is signed in and on the landing page, redirect to dashboard
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is not signed in and trying to access protected route
  if (!session && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", req.url));
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