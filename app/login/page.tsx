"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  let supabase: SupabaseClient | null = null;
  try {
    supabase = getSupabaseClient();
  } catch (_) {
    supabase = null;
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getUser().then((result) => {
      if (!mounted) return;
      // Ignore auth errors - they're expected when no session exists
      if (result.error && (result.error.message?.includes('Auth session missing') || result.error.name === 'AuthSessionMissingError')) {
        setUserEmail(null);
        return;
      }
      setUserEmail(result.data.user?.email ?? null);
    }).catch(() => {
      // Silently handle any errors - no session is a valid state
      if (mounted) {
        setUserEmail(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      sub?.subscription?.unsubscribe();
      mounted = false;
    };
  }, [supabase]);

  // If already authenticated, send the user to the app
  useEffect(() => {
    if (userEmail) {
      // Replace history so back button doesn’t bounce to login
      router.replace("/");
    }
  }, [userEmail, router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      const msg = "Auth is not configured. Check Supabase env vars.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const action = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const timed = Promise.race([
      action,
      new Promise<{ error: { message: string } }>((resolve) => setTimeout(() => resolve({ error: { message: "Network timeout. Check internet or Supabase URL." } }), 12000))
    ]) as Promise<{ error: any }>;

    const { error } = await timed;
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase().includes("invalid api key")
        ? "Invalid Supabase API key configured. Update NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
        : error.message;
      setError(msg);
      toast.error(msg || "Sign in failed");
      return;
    }
    // Successful auth: navigate to the app home
    router.replace("/");
  }

  async function handleLogout() {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      const msg = "Auth is not configured. Check Supabase env vars.";
      setError(msg);
      toast.error(msg);
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
  }
  async function handleResetPassword() {
    if (!email) {
      setError("Enter your email and click Forgot password.");
      return;
    }
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      const msg = "Auth is not configured. Check Supabase env vars.";
      setError(msg);
      toast.error(msg);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "http://localhost:3000/login" });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-4">
      <h1 className="text-2xl font-semibold text-white">Login</h1>
      {userEmail ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 12 }}>Signed in as {userEmail}</p>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <button
              onClick={() => router.replace("/")}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Go to app
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#111827",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-3 space-y-3">
          <label className="block text-white/80 text-sm">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <label className="block text-white/80 text-sm">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm transition cursor-pointer"
          >
            {loading ? (mode === "signin" ? "Signing in…" : "Creating account…") : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <div className="mt-2 flex items-center justify-between">
            <a href="/signup" className="text-yellow-400 text-xs">Create account</a>
            <button onClick={handleResetPassword} type="button" className="text-yellow-400 text-xs">Forgot password?</button>
          </div>
        </form>
      )}

      <p className="mt-4 text-xs text-white/60">After signing in, open the template selector to view your templates saved under RLS.</p>
    </div>
  );
}

