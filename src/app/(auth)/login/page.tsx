"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Add timeout for sign in
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Login request timeout")), 10000)
      );

      const { data, error: signInError } = (await Promise.race([
        signInPromise,
        timeoutPromise,
      ])) as any;

      if (signInError) {
        const msg = signInError.message || "Login failed";
        console.error("Sign in error:", msg);
        setError(msg);
        setLoading(false);
        return;
      }

      if (!data?.session) {
        setError("Login failed — no session returned. Please try again.");
        setLoading(false);
        return;
      }

      // OPTIMIZATION: Skip profile check - auth provider handles it
      // The trigger already creates profile on signup
      // If missing, auth provider will create it on next fetch
      // This reduces one database call and speeds up login

      // Force a hard navigation so the proxy re-evaluates the session cookie
      window.location.href = "/home";
    } catch (err: unknown) {
      console.error("Login error:", err);

      // Better error messages for network issues
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (
          msg.includes("failed to fetch") ||
          msg.includes("network") ||
          msg.includes("timeout")
        ) {
          errorMessage =
            "Network error. Check your connection and try again.";
        } else if (msg.includes("invalid")) {
          errorMessage = "Invalid email or password.";
        } else if (msg.includes("email")) {
          errorMessage = "Email not found or not verified.";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={styles.card}
    >
      {/* Logo */}
      <div className={styles.logoSection}>
        <h1 className={styles.logo}>HandyShop</h1>
        <p className={styles.tagline}>Discover local. Shop social.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            id="login-email"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            id="login-password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.eyeBtn}
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={styles.submitBtn}
          id="login-submit"
        >
          {loading ? (
            <div className={styles.spinner} />
          ) : (
            <>
              Log In <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className={styles.footer}>
        <p className="text-caption">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
