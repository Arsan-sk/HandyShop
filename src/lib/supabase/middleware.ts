import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do NOT remove this, it's critical for SSR
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Routes that handle their own auth (no redirect needed)
  const authOnlyPrefixes = ["/auth/", "/api/"];
  const isAuthHandler = authOnlyPrefixes.some((p) => pathname.startsWith(p));
  if (isAuthHandler) return supabaseResponse;

  // Auth pages — if user IS logged in, redirect to home
  const authPages = ["/login", "/signup", "/onboarding"];
  const isAuthPage = authPages.includes(pathname);
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Protected pages — if user is NOT logged in, redirect to login
  const publicPages = ["/", "/login", "/signup", "/onboarding"];
  const isPublicPage = publicPages.includes(pathname);
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
