"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextValue {
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isMountedRef = useRef(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string, retryCount = 0) => {
    if (!isMountedRef.current) return;

    console.log(`[Auth] fetchProfile started for userId: ${userId}, attempt: ${retryCount + 1}`);

    try {
      // Fetch profile with 35 second race timeout to accommodate database cold starts
      const queryPromise = supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      let timerId: NodeJS.Timeout | undefined = undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error("Abort: Profile fetch timeout")), 35000);
      });

      const result = await Promise.race([
        (async () => {
          try {
            const res = await queryPromise;
            if (timerId) clearTimeout(timerId);
            return res;
          } catch (err) {
            if (timerId) clearTimeout(timerId);
            throw err;
          }
        })(),
        timeoutPromise,
      ]);

      if (!isMountedRef.current) return;

      const { data, error } = result;

      if (error) {
        console.error(`[Auth] fetchProfile DB error:`, error);

        // Auto-create profile if missing from public.users table (PGRST116)
        if (error.code === "PGRST116") {
          console.warn("[Auth] Profile row missing in public.users. Attempting auto-recreation...");
          try {
            // Get user session metadata
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const email = authUser?.email || "";
            let derivedUsername = email.split("@")[0] || "user";
            derivedUsername = derivedUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_");
            if (derivedUsername.length < 3) derivedUsername += "_user";
            const username = `${derivedUsername}_${userId.substring(0, 4)}`;

            console.log(`[Auth] Recreating user profile with username: ${username}, email: ${email}`);

            const { data: newProfile, error: createError } = await supabase
              .from("users")
              .insert({
                id: userId,
                username,
                email: email || null,
                display_name: authUser?.user_metadata?.display_name || username,
                role: "buyer",
              })
              .select()
              .single();

            if (createError) {
              console.error("[Auth] Profile auto-recreation failed:", createError);
            } else if (newProfile) {
              console.log("[Auth] Profile auto-recreation succeeded!", newProfile);
              setProfile(newProfile as User);
              return;
            }
          } catch (createErr) {
            console.error("[Auth] Profile auto-recreation exception:", createErr);
          }
        }

        // Only log errors on final attempt or for critical errors
        if (retryCount >= 1) {
          console.error("[Auth] Profile fetch failed permanently:", error.code);
        }
        
        // Retry only for network errors, NOT PGRST116 (which we already handled or skipped)
        if (
          retryCount < 1 &&
          error.code !== "PGRST116" &&
          (error.message?.includes("fetch") || error.message?.includes("timeout"))
        ) {
          console.log("[Auth] Retrying profile fetch in 1s...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }
        setProfile(null);
        return;
      }

      if (data) {
        console.log("[Auth] Profile fetched successfully:", data);
        setProfile(data as User | null);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Auth] fetchProfile exception caught:`, errMsg);
      
      // Only log on final retry or critical errors
      if (retryCount >= 1) {
        console.error("[Auth] Profile fetch error permanently:", errMsg.substring(0, 50));
      }

      // Retry on network/timeout errors
      if (
        retryCount < 1 &&
        (errMsg.includes("network") || errMsg.includes("Abort") || errMsg.includes("timeout"))
      ) {
        console.log("[Auth] Retrying profile fetch on exception in 1s...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchProfile(userId, retryCount + 1);
      }

      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user && isMountedRef.current) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (isMountedRef.current) {
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (profile?.is_suspended) {
      console.warn("[Auth] User profile is suspended. Logging out...");
      signOut().then(() => {
        window.location.href = "/login?error=suspended";
      });
    }
  }, [profile]);

  useEffect(() => {
    isMountedRef.current = true;
    console.log("[Auth] AuthProvider mounted. hasInitialized:", hasInitialized);
    // Prevent multiple initializations
    if (hasInitialized) return;

    const getSession = async () => {
      console.log("[Auth] getSession started...");
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (error) {
          console.error("[Auth] Session error:", error.code);
          setUser(null);
          setProfile(null);
        } else {
          const session = data?.session;
          console.log("[Auth] Session result user id:", session?.user?.id || "No session");
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[Auth] Session fetch error:", errMsg.substring(0, 50));
        setUser(null);
        setProfile(null);
      } finally {
        if (isMountedRef.current) {
          console.log("[Auth] getSession completed. Setting loading to false.");
          setLoading(false);
          setHasInitialized(true);
        }
      }
    };

    getSession();

    // Listen for auth changes - debounce rapid successive calls
    let lastAuthChangeTime = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Debounce: ignore auth changes within 1000ms of the last one
        const now = Date.now();
        if (now - lastAuthChangeTime < 1000) {
          return;
        }
        lastAuthChangeTime = now;

        if (!isMountedRef.current) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
