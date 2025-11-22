"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";
import { toast } from "sonner";

export default function SignupPage() {
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

  useEffect(() => {
    if (userEmail) {
      router.replace("/");
    }
  }, [userEmail, router]);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.replace("/");
      return;
    }
    toast.success("Account created. Please sign in.");
    router.replace("/login");
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-4">
      <h1 className="text-2xl font-semibold text-white">Create Account</h1>
      <form onSubmit={handleSignup} className="mt-3 space-y-3">
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
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm transition"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
          <div className="mt-2 text-center">
            <a href="/login" className="text-yellow-400 text-xs">Have an account? Sign in</a>
          </div>
        </form>
      
    </div>
  );
}
