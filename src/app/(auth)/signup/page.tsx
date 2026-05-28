"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Username validation (PRD §28)
  const isValidUsername = (u: string) => /^[a-z0-9_]{3,30}$/.test(u);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailSent(false);

    if (!isValidUsername(username)) {
      setError(
        "Username must be 3–30 characters: lowercase letters, numbers, underscores only."
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Check username uniqueness — wrapped in try/catch so a missing table doesn't crash
      try {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("username", username)
          .maybeSingle(); // maybeSingle() returns null (not error) when 0 rows found

        if (existingUser) {
          setError("Username is already taken. Please choose another.");
          setLoading(false);
          return;
        }
      } catch (err) {
        // Table may not exist yet — continue with signup anyway
        console.error("Username check error (continuing):", err);
      }

      // Sign up with Supabase Auth - with timeout
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signup request timeout")), 10000)
      );

      const { data: authData, error: authError } = (await Promise.race([
        signUpPromise,
        timeoutPromise,
      ])) as any;

      if (authError) {
        const msg = authError.message || "Signup failed";
        console.error("Auth error:", msg);
        setError(msg);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Signup failed — no user returned. Please try again.");
        setLoading(false);
        return;
      }

      // Case 1: Session returned immediately (email confirmation disabled in Supabase)
      if (authData.session) {
        console.log("Signup successful with session, user ID:", authData.user.id);

        // Try to insert profile — trigger should have created it already
        // But we do this as fallback
        try {
          const insertPromise = supabase.from("users").insert({
            id: authData.user.id,
            username,
            email: authData.user.email,
            display_name: username,
            role: "buyer",
          });

          const profileTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile insert timeout")), 5000)
          );

          await Promise.race([insertPromise, profileTimeoutPromise]);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("duplicate")) {
            // Profile already exists from trigger — expected
            console.log("Profile already exists (created by trigger)");
          } else {
            console.error("Profile insert error:", errMsg);
          }
        }

        // Small delay to ensure everything is synced
        setLoading(false);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Navigate to onboarding
        setEmailSent(false);
        router.push("/onboarding");
        router.refresh();
        return;
      }

      // Case 2: Email confirmation required
      console.log("Email confirmation required, verification sent to:", email);
      setEmailSent(true);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Signup error:", err);

      let errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";

      // Better error messages
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("timeout")
      ) {
        errorMessage = "Network error. Check your connection and try again.";
      } else if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("Invalid")
      ) {
        errorMessage = "Invalid email or password.";
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  // If email was sent, show a dedicated confirmation screen
  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={styles.card}
      >
        <div className={styles.logoSection}>
          <div className={styles.emailIcon}>
            <Mail size={32} />
          </div>
          <h1 className={styles.emailTitle}>Check your inbox</h1>
          <p className={styles.tagline}>
            We sent a verification link to <strong>{email}</strong>. Click it to
            activate your account.
          </p>
        </div>
        <p className={styles.info}>
          After verifying, you&apos;ll be redirected to the app automatically.
        </p>
        <div className={styles.footer}>
          <p className="text-caption">
            Already verified?{" "}
            <Link href="/login" className={styles.link}>
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

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
        <p className={styles.tagline}>Join your local shopping community</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className={styles.form}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
            }
            className={styles.input}
            id="signup-username"
            required
            autoComplete="username"
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            id="signup-email"
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            id="signup-password"
            required
            minLength={6}
            autoComplete="new-password"
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
          id="signup-submit"
        >
          {loading ? (
            <div className={styles.spinner} />
          ) : (
            <>
              Create Account <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className={styles.footer}>
        <p className="text-caption">
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
