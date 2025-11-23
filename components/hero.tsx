"use client"

import type React from "react"

import { Upload } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "../lib/supabase"
import Link from "next/link"
import { motion } from "framer-motion"

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

  const validateFile = (file: File): boolean => {
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ]
    const allowedExtensions = ["pdf", "png", "jpg", "jpeg"]
    
    // Check file size
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 10MB limit. Please upload a smaller file.")
      return false
    }

    // Check MIME type
    const isValidType = allowedTypes.includes(file.type.toLowerCase())
    
    // Also check file extension as fallback
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
    const isValidExtension = allowedExtensions.includes(fileExtension)

    if (!isValidType && !isValidExtension) {
      const attemptedType = file.type || "unknown"
      const ext = file.name.split(".").pop()?.toUpperCase() || "UNKNOWN"
      toast.error(`Invalid file format. Only upload PDF, PNG, JPG, or JPEG formats. Selected file: ${ext} (${attemptedType})`)
      return false
    }

    return true
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
      
      if (!validateFile(file)) {
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
      
      if (!validateFile(file)) {
        // Reset the input so user can try again
        e.target.value = ""
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -180 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  }

  return (
    <section className="w-full h-full flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className={`glass glass-hover p-8 md:p-12 text-center cursor-pointer transition-all ${
            isDragging ? "border-yellow-500 bg-white/10 glow-border" : ""
          }`}
        >
          <motion.div 
            className="flex justify-center mb-6"
            variants={iconVariants}
          >
            <div className="p-4 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-full">
              <Upload className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>

          <motion.h2 
            className="gradient-text text-2xl md:text-3xl font-bold mb-3"
            variants={itemVariants}
          >
            Extract Data from Tables
          </motion.h2>
          
          <motion.p 
            className="text-white/60 mb-8"
            variants={itemVariants}
          >
            {isAuthed ? "Upload an image or PDF (≤ 10MB) and AI will extract the table data" : "Sign in to upload an image or PDF (≤ 10MB)"}
          </motion.p>

          <motion.div variants={itemVariants}>
            {isAuthed ? (
              <label className="inline-block">
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,image/jpeg,image/png,image/jpg,application/pdf" onChange={handleFileSelect} className="hidden" />
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
          </motion.div>

          <motion.p 
            className="text-white/40 text-sm mt-6"
            variants={itemVariants}
          >
            {isAuthed ? "or drag and drop your image/PDF here" : "Sign in first, then drag and drop your image/PDF here"}
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
