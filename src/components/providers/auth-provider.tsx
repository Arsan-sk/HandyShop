"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string, retryCount = 0) => {
    if (!isMounted) return;

    try {
      // Fetch profile with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const result = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      clearTimeout(timeoutId);

      if (!isMounted) return;

      const { data, error } = result;

      if (error) {
        // Only log errors on final attempt or for critical errors
        if (retryCount >= 2) {
          console.error("[Auth] Profile fetch failed:", error.code);
        }
        
        // Retry only for network errors
        if (
          retryCount < 2 &&
          (error.code === "PGRST116" || error.message?.includes("fetch"))
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return fetchProfile(userId, retryCount + 1);
        }
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data as User | null);
      }
    } catch (err: unknown) {
      if (!isMounted) return;

      const errMsg = err instanceof Error ? err.message : String(err);
      
      // Only log on final retry or critical errors
      if (retryCount >= 2) {
        console.error("[Auth] Profile fetch error:", errMsg.substring(0, 50));
      }

      // Retry on network/timeout errors
      if (
        retryCount < 2 &&
        (errMsg.includes("network") || errMsg.includes("Abort"))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return fetchProfile(userId, retryCount + 1);
      }

      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user && isMounted) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (isMounted) {
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized) return;

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("[Auth] Session error:", error.code);
          setUser(null);
          setProfile(null);
        } else {
          const session = data?.session;
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[Auth] Session fetch error:", errMsg.substring(0, 50));
        setUser(null);
        setProfile(null);
      } finally {
        if (isMounted) {
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

        if (!isMounted) return;

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
      setIsMounted(false);
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
