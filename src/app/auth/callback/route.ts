import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle Supabase error redirects
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const url = new URL(
      `/login?error=${encodeURIComponent(errorDescription ?? error)}`,
      origin
    );
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  );

  try {
    // Exchange code for session - with timeout
    const exchangePromise = supabase.auth.exchangeCodeForSession(code);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Code exchange timeout")), 10000)
    );

    const { data, error: exchangeError } = (await Promise.race([
      exchangePromise,
      timeoutPromise,
    ])) as any;

    if (exchangeError || !data?.user) {
      console.error("Code exchange failed:", exchangeError?.message || "No user");
      return NextResponse.redirect(
        new URL("/login?error=code_exchange_failed", origin)
      );
    }

    const user = data.user;

    // Wait a moment for the trigger to create the profile
    // (handles race condition where trigger hasn't fired yet)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check if this is a new user (no profile yet)
    let profileCheckPromise = supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    let profileTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Profile check timeout")), 5000)
    );

    let result = (await Promise.race([
      profileCheckPromise,
      profileTimeoutPromise,
    ])) as any;

    let { data: existingProfile } = result;

    // If still no profile after trigger, create it manually
    if (!existingProfile) {
      const meta = user.user_metadata ?? {};
      const email = user.email ?? "";
      const username =
        meta.username ||
        email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_") ||
        `user_${user.id.slice(0, 8)}`;

      try {
        const insertPromise = supabase.from("users").insert({
          id: user.id,
          username,
          email,
          display_name: meta.display_name || username,
          role: "buyer",
        });

        const insertTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile insert timeout")), 5000)
        );

        const { error: insertError } = (await Promise.race([
          insertPromise,
          insertTimeoutPromise,
        ])) as any;

        if (insertError) {
          console.error("Profile insert error in callback:", insertError);
          // Still proceed — profile may have been created by trigger
        }
      } catch (err) {
        console.error(
          "Profile insert failed in callback:",
          err instanceof Error ? err.message : String(err)
        );
        // Still proceed — profile may have been created by trigger
      }

      // Wait again to ensure profile exists
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify profile now exists
      try {
        profileCheckPromise = supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        profileTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile verify timeout")), 5000)
        );

        result = (await Promise.race([
          profileCheckPromise,
          profileTimeoutPromise,
        ])) as any;

        ({ data: existingProfile } = result);
      } catch (err) {
        console.error(
          "Profile verification failed:",
          err instanceof Error ? err.message : String(err)
        );
        // Continue anyway
      }
    }

    // New user (no profile or just created) → onboarding
    // Existing user with profile → intended destination
    const targetPath = existingProfile ? next : "/onboarding";
    return NextResponse.redirect(new URL(targetPath, origin));
  } catch (err) {
    console.error(
      "Callback error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.redirect(
      new URL("/login?error=callback_failed", origin)
    );
  }
}
