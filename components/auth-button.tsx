"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "../lib/supabase"

export default function AuthButton() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient()
    } catch (e: any) {
      setInitError(e?.message ?? "Failed to initialize Supabase client")
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUserEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => {
      sub?.subscription?.unsubscribe()
      mounted = false
    }
  }, [supabase])

  const handleLogin = () => {
    router.push("/login")
  }

  const handleLogout = async () => {
    if (!supabase) return
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  // Small overlay top-right to mimic desktop app menu area
  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg px-3 py-2 shadow-2xl flex items-center gap-3">
        {initError ? (
          <span className="text-xs text-red-300">Auth init failed</span>
        ) : userEmail ? (
          <>
            <span className="text-xs text-white/80 hidden sm:inline">{userEmail}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-md border border-white/20 text-xs font-semibold transition"
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md text-xs font-bold transition glow-border"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  )
}

