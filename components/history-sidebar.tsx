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
}

interface HistorySidebarProps {
  open: boolean
  onClose: () => void
  onSelect: (row: ExtractionRow) => void
}

export default function HistorySidebar({ open, onClose, onSelect }: HistorySidebarProps) {
  const [items, setItems] = useState<ExtractionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const supabase = getSupabaseClient()
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser()
        if (userErr) throw userErr
        if (!user) {
          setItems([])
          setError("Sign in to view your history")
          return
        }

        const { data, error } = await supabase
          .from("extractions")
          .select("id,user_id,image_url,rows_selected,cols_selected,data,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100)
        if (error) throw error
        setItems((data || []) as ExtractionRow[])

        // Subscribe to realtime inserts/deletes for this user
        const channel = supabase
          .channel(`extractions-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'extractions', filter: `user_id=eq.${user.id}` },
            (payload: any) => {
              const row = payload?.new as ExtractionRow
              if (!row) return
              setItems((prev) => [row, ...prev])
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'extractions', filter: `user_id=eq.${user.id}` },
            (payload: any) => {
              const id = payload?.old?.id
              if (!id) return
              setItems((prev) => prev.filter((i) => i.id !== id))
            }
          )
          .subscribe()

        return () => {
          channel.unsubscribe()
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load history")
      } finally {
        setLoading(false)
      }
    }
    let cleanup: (() => void) | undefined
    if (open) {
      load().then((c) => {
        // if load returns a cleanup (unsubscribe), store it
        if (typeof c === 'function') cleanup = c
      })
    }
    return () => {
      cleanup?.()
    }
  }, [open])

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
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm">Close</button>
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
                onClick={() => onSelect(item)}
                title="Load this extraction"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 bg-white/5 rounded overflow-hidden">
                    {item.image_url ? (
                      <Image src={item.image_url} alt="Preview" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm">{new Date(item.created_at).toLocaleString()}</p>
                    <p className="text-white/60 text-xs truncate">{JSON.stringify(item.data)?.slice(0, 80)}</p>
                  </div>
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