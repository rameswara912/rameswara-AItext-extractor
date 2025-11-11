"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Successful sign-in: navigate to the app home
    router.replace("/");
  }

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Login</h1>
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
        <form onSubmit={handleLogin} style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 12,
            }}
          />
          <label style={{ display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              marginBottom: 12,
            }}
          />
          {error && (
            <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        After signing in, open the template selector to view your templates
        saved under RLS.
      </p>
    </div>
  );
}

