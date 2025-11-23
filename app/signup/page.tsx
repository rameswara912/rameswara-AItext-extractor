"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";
import { toast } from "sonner";
import { isAdmin, getAdminEmail } from "../../lib/admin-check";

export default function SignupPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      // Ignore auth errors - they're expected when no session exists
      if (error && (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError')) {
        setUserEmail(null);
        setIsAdminUser(false);
        setCheckingAdmin(false);
        return;
      }
      const email = data.user?.email ?? null;
      setUserEmail(email);
      
      // Check if user is admin
      if (email) {
        isAdmin().then((admin) => {
          if (mounted) {
            setIsAdminUser(admin);
            setCheckingAdmin(false);
          }
        });
      } else {
        setIsAdminUser(false);
        setCheckingAdmin(false);
      }
    }).catch(() => {
      // Silently handle any errors - no session is a valid state
      if (mounted) {
        setUserEmail(null);
        setIsAdminUser(false);
        setCheckingAdmin(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (email) {
        isAdmin().then((admin) => {
          setIsAdminUser(admin);
          setCheckingAdmin(false);
        });
      } else {
        setIsAdminUser(false);
        setCheckingAdmin(false);
      }
    });
    return () => {
      sub?.subscription?.unsubscribe();
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    // Only redirect if admin check is complete and user is not admin
    // Don't redirect while checking admin status (checkingAdmin === true)
    if (!checkingAdmin && userEmail && isAdminUser === false) {
      // If user is logged in but not admin, redirect to home
      router.replace("/");
    }
  }, [userEmail, isAdminUser, checkingAdmin, router]);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Check if current user is admin before allowing signup
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      const errorMsg = "Only administrators can create new accounts. Please contact an administrator.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created successfully!");
      router.replace("/");
      return;
    }
    toast.success("Account created. Please sign in.");
    router.replace("/login");
  }

  // Show loading state while checking admin status
  if (checkingAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-10 p-4">
        <div className="text-white text-center">Checking permissions...</div>
      </div>
    );
  }

  // If not admin, show error message
  if (!isAdminUser) {
    return (
      <div className="max-w-sm mx-auto mt-10 p-4">
        <h1 className="text-2xl font-semibold text-white mb-4">Access Denied</h1>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
          <p className="text-red-300 text-sm">
            Only administrators can create new accounts. Please contact an administrator at {getAdminEmail()} to create an account.
          </p>
        </div>
        <div className="text-center">
          <a href="/login" className="text-yellow-400 text-xs">Have an account? Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-10 p-4">
      <h1 className="text-2xl font-semibold text-white">Create Account (Admin Only)</h1>
      <p className="text-white/60 text-xs mt-2 mb-4">You are logged in as an administrator. You can create new user accounts.</p>
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
