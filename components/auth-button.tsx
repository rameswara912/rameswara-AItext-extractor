"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSupabaseClient } from "../lib/supabase"
import { GUEST_MODE, getGuestUserEmail } from "../lib/guest-mode"
import { isAdmin } from "../lib/admin-check"

export default function AuthButton() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false)

  const supabase = useMemo(() => {
    try {
      return getSupabaseClient()
    } catch (e: any) {
      setInitError(e?.message ?? "Failed to initialize Supabase client")
      return null
    }
  }, [])

  useEffect(() => {
    // In guest mode, auto-authenticate
    if (GUEST_MODE) {
      setUserEmail(getGuestUserEmail())
      setIsAdminUser(false)
      return
    }

    if (!supabase) return
    let mounted = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      // Ignore auth errors - they're expected when no session exists
      if (error && (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError')) {
        setUserEmail(null)
        setIsAdminUser(false)
        return
      }
      const email = data.user?.email ?? null
      setUserEmail(email)
      
      // Check if user is admin
      if (email) {
        isAdmin().then((admin) => {
          if (mounted) {
            setIsAdminUser(admin)
          }
        })
      } else {
        setIsAdminUser(false)
      }
    }).catch(() => {
      // Silently handle any errors - no session is a valid state
      if (mounted) {
        setUserEmail(null)
        setIsAdminUser(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null
      setUserEmail(email)
      if (email) {
        isAdmin().then((admin) => {
          setIsAdminUser(admin)
        })
      } else {
        setIsAdminUser(false)
      }
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
    if (GUEST_MODE) {
      setUserEmail(null)
      return
    }
    if (!supabase) return
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  // Small overlay top-right to mimic desktop app menu area
  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg px-3 py-2 shadow-2xl flex items-center gap-3">
        {initError && !GUEST_MODE ? (
          <span className="text-xs text-red-300">Auth init failed</span>
        ) : userEmail ? (
          <>
            <span className="text-xs text-white/80 hidden sm:inline">
              {userEmail}
              {GUEST_MODE && " (Guest)"}
            </span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-md border border-white/20 text-xs font-semibold transition"
            >
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {isAdminUser && (
              <Link
                href="/signup"
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-md border border-white/20 text-xs font-semibold transition"
              >
                Sign up
              </Link>
            )}
            <Link
              href="/login"
              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md text-xs font-bold transition glow-border"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

