"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getSupabaseClient } from "@/lib/supabase"
import { Clock, Trash2 } from "lucide-react"

export interface ExtractionRow {
  id: string
  user_id: string
  image_url: string | null
  rows_selected: any
  cols_selected: any
  data: any
  created_at: string
  columns?: any
  ai_instruction?: string
}

interface HistorySidebarProps {
  open: boolean
  onClose: () => void
  onSelect: (row: ExtractionRow) => void
  refreshTrigger?: number // When this changes, refresh the history
}

export default function HistorySidebar({ open, onClose, onSelect, refreshTrigger }: HistorySidebarProps) {
  const [items, setItems] = useState<ExtractionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Refresh when refreshTrigger prop changes (from parent)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log("[HistorySidebar] Refresh triggered from parent:", refreshTrigger)
      setRefreshKey(prev => prev + 1)
    }
  }, [refreshTrigger])

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Set a timeout to prevent infinite loading (increased to 30 seconds)
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error("[HistorySidebar] Loading timeout after 30 seconds")
            setError("Loading timeout. The database might be slow. Please try refreshing.")
            setLoading(false)
          }
        }, 30000)
        
        // Initialize Supabase client with error handling
        let supabase;
        try {
          supabase = getSupabaseClient()
          console.log("[HistorySidebar] Supabase client initialized successfully")
        } catch (initError: any) {
          console.error("[HistorySidebar] Failed to initialize Supabase client:", initError)
          if (timeoutId) clearTimeout(timeoutId)
          if (isMounted) {
            const errorMsg = initError?.message || "Failed to initialize database connection"
            setError(`Configuration error: ${errorMsg}. Please check your environment variables.`)
            setLoading(false)
          }
          return
        }
        
        console.log("[HistorySidebar] Getting user...")
        
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()
        
        if (userErr) {
          console.error("[HistorySidebar] Error getting user:", userErr)
          if (isMounted) {
            setError(`Authentication error: ${userErr.message}`)
            setLoading(false)
          }
          if (timeoutId) clearTimeout(timeoutId)
          return
        }
        
        if (!user) {
          console.warn("[HistorySidebar] No user found")
          if (isMounted) {
            setItems([])
            setError("Sign in to view your history")
            setLoading(false)
          }
          if (timeoutId) clearTimeout(timeoutId)
          return
        }

        console.log("[HistorySidebar] Loading history for user:", user.id)
        
        // Use a simpler query - don't select the large 'data' field initially to speed up loading
        // The 'data' field can be very large (JSONB with extracted data) and slows down the query
        // We'll load it later when the user clicks on a history item
        const startTime = Date.now()
        
        try {
          console.log("[HistorySidebar] Executing query...")
          const queryPromise = supabase
            .from("extractions")
            .select("id,user_id,image_url,rows_selected,cols_selected,created_at,columns,ai_instruction")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100)
          
          const { data, error } = await queryPromise
          
          const queryTime = Date.now() - startTime
          console.log(`[HistorySidebar] Query completed in ${queryTime}ms`)
          
          if (timeoutId) clearTimeout(timeoutId)
          
          if (error) {
            console.error("[HistorySidebar] Error loading history:", error)
            console.error("[HistorySidebar] Error code:", error.code)
            console.error("[HistorySidebar] Error message:", error.message)
            if (isMounted) {
              setError(`Failed to load history: ${error.message || 'Unknown error'}`)
              setLoading(false)
            }
            return
          }
          
          console.log("[HistorySidebar] Loaded history items:", data?.length || 0, "items")
          if (data && data.length > 0) {
            console.log("[HistorySidebar] First item:", { id: data[0].id, created_at: data[0].created_at, has_image: !!data[0].image_url })
          }
          
          if (isMounted) {
            setItems((data || []) as ExtractionRow[])
            setLoading(false)
          }
        } catch (queryError: any) {
          console.error("[HistorySidebar] Exception during query:", queryError)
          if (timeoutId) clearTimeout(timeoutId)
          if (isMounted) {
            setError(`Query failed: ${queryError?.message || 'Network error'}`)
            setLoading(false)
          }
          return
        }

        // Subscribe to realtime inserts/updates/deletes for this user
        // Only subscribe if component is still mounted
        if (isMounted) {
          console.log("[HistorySidebar] Setting up realtime subscription...")
          const channel = supabase
            .channel(`extractions-${user.id}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'extractions', filter: `user_id=eq.${user.id}` },
              (payload: any) => {
                console.log("[HistorySidebar] Realtime INSERT received:", payload?.new?.id)
                if (!isMounted) return
                const row = payload?.new as ExtractionRow
                if (!row) return
                setItems((prev) => {
                  // Check if item already exists (avoid duplicates)
                  if (prev.some(i => i.id === row.id)) {
                    return prev
                  }
                  return [row, ...prev]
                })
              }
            )
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'extractions', filter: `user_id=eq.${user.id}` },
              (payload: any) => {
                console.log("[HistorySidebar] Realtime UPDATE received:", payload?.new?.id)
                if (!isMounted) return
                const row = payload?.new as ExtractionRow
                if (!row?.id) return
                setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...row } : i)))
              }
            )
            .on(
              'postgres_changes',
              { event: 'DELETE', schema: 'public', table: 'extractions', filter: `user_id=eq.${user.id}` },
              (payload: any) => {
                console.log("[HistorySidebar] Realtime DELETE received:", payload?.old?.id)
                if (!isMounted) return
                const id = payload?.old?.id
                if (!id) return
                setItems((prev) => prev.filter((i) => i.id !== id))
              }
            )
            .subscribe((status) => {
              console.log("[HistorySidebar] Realtime subscription status:", status)
              if (status === 'SUBSCRIBED') {
                console.log("[HistorySidebar] Successfully subscribed to realtime updates")
              } else if (status === 'CHANNEL_ERROR') {
                console.error("[HistorySidebar] Realtime subscription error")
              }
            })

          return () => {
            console.log("[HistorySidebar] Cleaning up realtime subscription")
            channel.unsubscribe()
            if (timeoutId) clearTimeout(timeoutId)
          }
        }
      } catch (e: any) {
        console.error("[HistorySidebar] Exception in load:", e)
        if (timeoutId) clearTimeout(timeoutId)
        if (isMounted) {
          setError(e?.message || "Failed to load history")
          setLoading(false)
        }
      }
    }
    let cleanup: (() => void) | undefined
    if (open) {
      // Always reload when sidebar opens to ensure we have the latest data
      load().then((c) => {
        // if load returns a cleanup (unsubscribe), store it
        if (typeof c === 'function') cleanup = c
      }).catch((err) => {
        console.error("[HistorySidebar] Load promise rejected:", err)
        setError(`Failed to load: ${err?.message || 'Unknown error'}`)
        setLoading(false)
      })
    } else {
      // When sidebar closes, clear items to force reload next time
      setItems([])
      setLoading(false)
      setError(null)
    }
    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      cleanup?.()
    }
  }, [open, refreshKey]) // Reload when refreshKey changes

  // Manual refresh function
  const handleRefresh = () => {
    console.log("[HistorySidebar] Manual refresh triggered")
    setRefreshKey(prev => prev + 1)
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("extractions").delete().eq("id", id)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  return (
    <div
      className={`fixed top-0 left-0 h-full w-80 transform transition-transform duration-300 z-50 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full glass glow-border p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h3 className="text-white font-semibold">History</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh} 
              className="text-white/60 hover:text-white text-sm px-2 py-1 rounded hover:bg-white/10"
              title="Refresh history"
            >
              ↻
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white text-sm">Close</button>
          </div>
        </div>

        {loading && <div className="text-white/60 text-sm">Loading…</div>}
        {error && <div className="text-red-300 text-sm">{error}</div>}

        <div className="flex-1 overflow-auto space-y-2">
          {items.length === 0 && !loading && (
            <div className="text-white/40 text-sm">No history yet</div>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded border border-white/10 hover:bg-white/5 transition">
              <button
                className="flex-1 text-left"
                onClick={async () => {
                  try {
                    const supabase = getSupabaseClient()
                    const { data: full } = await supabase
                      .from("extractions")
                      .select("id,user_id,image_url,rows_selected,cols_selected,data,created_at,columns,ai_instruction")
                      .eq("id", item.id)
                      .single()
                    onSelect((full as any) || item)
                  } catch {
                    onSelect(item)
                  }
                }}
                title="Load this extraction"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 bg-white/5 rounded overflow-hidden">
                    {item.image_url && !item.image_url.includes("...[truncated]") ? (
                      <Image 
                        src={item.image_url} 
                        alt="Preview" 
                        fill 
                        className="object-cover"
                        onError={(e) => {
                          // If image fails to load, hide it
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                        {item.image_url?.includes("...[truncated]") ? "..." : "📷"}
                      </div>
                    )}
                  </div>
                  <p className="text-white text-sm">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 rounded bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-white/40 text-xs mt-2">Items older than 10 days are removed automatically.</p>
      </div>
    </div>
  )
}
