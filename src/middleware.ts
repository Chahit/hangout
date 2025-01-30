import { createServerClient } from '@supabase/ssr';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const sessionCache = new Map();
const profileCache = new Map();

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Auth routes that should be accessible without session
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = req.nextUrl.pathname === "/";
  const isOnboardingRoute = req.nextUrl.pathname === "/onboarding";
  const isStaticRoute = req.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|json)$/);

  // Always allow these routes to proceed without any checks
  if (isAuthRoute || isPublicRoute || isOnboardingRoute || isStaticRoute) {
    return res;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options })
          },
        },
      }
    );
    
    // Try to get session from cache first
    const cacheKey = req.cookies.get('sb-access-token')?.value;
    const now = Date.now();
    let session;

    if (cacheKey && sessionCache.has(cacheKey)) {
      const cached = sessionCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL) {
        session = cached.session;
      } else {
        sessionCache.delete(cacheKey);
      }
    }

    // If not in cache, fetch from Supabase
    if (!session) {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      session = newSession;

      // Cache the new session
      if (cacheKey && session) {
        sessionCache.set(cacheKey, {
          session,
          timestamp: now
        });
      }
    }

    // If user is not signed in and trying to access protected route
    if (!session) {
      const redirectUrl = new URL("/auth", req.url);
      redirectUrl.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check profile from cache
    let profile;
    const profileCacheKey = session.user.id;

    if (profileCache.has(profileCacheKey)) {
      const cached = profileCache.get(profileCacheKey);
      if (now - cached.timestamp < CACHE_TTL) {
        profile = cached.profile;
      } else {
        profileCache.delete(profileCacheKey);
      }
    }

    // If not in cache, fetch from Supabase with rate limit handling
    if (!profile) {
      try {
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('id, batch, branch, username')
          .eq('id', session.user.id)
          .single();

        profile = newProfile;

        // Cache the new profile
        if (profile) {
          profileCache.set(profileCacheKey, {
            profile,
            timestamp: now
          });
        }
      } catch (error: unknown) {
        // If rate limited, use cached profile if available
        if (error instanceof Error && error.message.includes('rate limit') && profileCache.has(profileCacheKey)) {
          const cached = profileCache.get(profileCacheKey);
          profile = cached.profile;
        } else {
          throw error;
        }
      }
    }

    // If no profile or incomplete profile, redirect to onboarding
    if (!profile || !profile.batch || !profile.branch || !profile.username) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    return res;
  } catch (error: unknown) {
    console.error('Middleware error:', error);
    
    // For rate limit errors, return the original response instead of redirecting
    if (error instanceof Error && error.message.includes('rate limit')) {
      console.warn('Rate limit reached, proceeding with request');
      return res;
    }

    // For other errors, redirect to auth with error message
    const redirectUrl = new URL("/auth", req.url);
    redirectUrl.searchParams.set("error", "An error occurred. Please try again.");
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}; 