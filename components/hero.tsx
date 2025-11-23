"use client"

import type React from "react"

import { Upload } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "../lib/supabase"
import Link from "next/link"

interface HeroProps {
  onImageUpload: (imageUrl: string) => void
}

export default function Hero({ onImageUpload }: HeroProps) {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
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
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      // Ignore auth errors - they're expected when no session exists
      if (error && (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError')) {
        setIsAuthed(false)
        return
      }
      setIsAuthed(!!data.user)
    }).catch(() => {
      // Silently handle any errors - no session is a valid state
      if (mounted) {
        setIsAuthed(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user)
    })
    return () => {
      sub?.subscription?.unsubscribe()
      mounted = false
    }
  }, [supabase])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!isAuthed) {
      toast.error("Please sign in to upload files.")
      router.push("/login")
      return
    }
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "application/pdf",
      ]

      if (!allowedTypes.includes(file.type)) {
        const attemptedType = file.type || "unknown"
        const ext = file.name.split(".").pop()?.toUpperCase() || "UNKNOWN"
        toast.error(`Only JPG, PNG or PDF files are allowed. Selected: ${attemptedType} (${ext})`)
        return
      }

      if (file.size > MAX_SIZE) {
        toast.error("File size exceeds 10MB limit.")
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthed) {
      toast.error("Please sign in to upload files.")
      router.push("/login")
      return
    }
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      const file = files[0]
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "application/pdf",
      ]

      if (!allowedTypes.includes(file.type)) {
        const attemptedType = file.type || "unknown"
        const ext = file.name.split(".").pop()?.toUpperCase() || "UNKNOWN"
        toast.error(`Only JPG, PNG or PDF files are allowed. Selected: ${attemptedType} (${ext})`)
        return
      }

      if (file.size > MAX_SIZE) {
        toast.error("File size exceeds 10MB limit.")
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <section className="w-full h-full flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass glass-hover p-8 md:p-12 text-center cursor-pointer transition-all ${
            isDragging ? "border-yellow-500 bg-white/10 glow-border" : ""
          }`}
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-full">
              <Upload className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <h2 className="gradient-text text-2xl md:text-3xl font-bold mb-3">Extract Data from Tables</h2>
          <p className="text-white/60 mb-8">
            {isAuthed ? "Upload an image or PDF (≤ 10MB) and AI will extract the table data" : "Sign in to upload an image or PDF (≤ 10MB)"}
          </p>

          {isAuthed ? (
            <label className="inline-block">
              <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileSelect} className="hidden" />
              <span className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg cursor-pointer transition glow-border inline-block">
                Choose Image
              </span>
            </label>
          ) : (
            <Link
              href="/login"
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition glow-border inline-block"
            >
              Sign in to Upload
            </Link>
          )}

          <p className="text-white/40 text-sm mt-6">
            {isAuthed ? "or drag and drop your image/PDF here" : "Sign in first, then drag and drop your image/PDF here"}
          </p>
        </div>
      </div>
    </section>
  )
}
