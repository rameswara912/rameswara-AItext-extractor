"use client"

import { useState, useRef, useEffect } from "react"
import Hero from "@/components/hero"
import SelectionPanel from "@/components/selection-panel"
import ExtractedDataPanel from "@/components/extracted-data-panel"
import FloatingNavbar from "@/components/floating-navbar"
import HistorySidebar from "@/components/history-sidebar"
import dynamic from "next/dynamic"
import { History, UserPlus } from "lucide-react"
const AuthButton = dynamic(() => import("@/components/auth-button"), { ssr: false })
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "sonner"
import { isAdmin } from "@/lib/admin-check"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [dataSelected, setDataSelected] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set())
  const [currentStep, setCurrentStep] = useState<"upload" | "select" | "extract">("upload")
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractData, setExtractData] = useState<any>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [currentExtractionId, setCurrentExtractionId] = useState<string | null>(null)
  const [prefillColumns, setPrefillColumns] = useState<any[] | undefined>(undefined)
  const [prefillAIInstruction, setPrefillAIInstruction] = useState<string | undefined>(undefined)
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const uploadSectionRef = useRef<HTMLDivElement>(null)
  const selectSectionRef = useRef<HTMLDivElement>(null)
  const extractSectionRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  // Check if user is admin
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      // Ignore auth errors - they're expected when no session exists
      if (error && (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError')) {
        setIsAdminUser(false)
        setUserEmail(null)
        return
      }
      const email = data?.user?.email ?? null
      setUserEmail(email)
      if (data?.user) {
        isAdmin().then((admin) => {
          if (mounted) {
            setIsAdminUser(admin)
          }
        })
      } else {
        setIsAdminUser(false)
      }
    }).catch(() => {
      if (mounted) {
        setIsAdminUser(false)
        setUserEmail(null)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null
      setUserEmail(email)
      if (session?.user) {
        isAdmin().then((admin) => {
          setIsAdminUser(admin)
        })
      } else {
        setIsAdminUser(false)
        // Reset to upload page when user signs out
        setCurrentStep("upload")
        setUploadedImage(null)
        setDataSelected(false)
        setSelectedRows(new Set())
        setSelectedCols(new Set())
        setExtractData(null)
        setExtractError(null)
        setCurrentExtractionId(null)
        setPrefillColumns(undefined)
        setPrefillAIInstruction(undefined)
        // Scroll to upload section after state reset
        setTimeout(() => {
          uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      }
    })
    return () => {
      sub?.subscription?.unsubscribe()
      mounted = false
    }
  }, [supabase])

  const handleStepChange = (step: "upload" | "select" | "extract") => {
    setCurrentStep(step)

    if (step === "upload") {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    } else if (step === "select" && uploadedImage) {
      selectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    } else if (step === "extract" && dataSelected) {
      extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Explicitly start a new upload: clears previous state
  const handleNewUpload = () => {
    setCurrentStep("upload")
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setUploadedImage(null)
    setDataSelected(false)
    setSelectedRows(new Set())
    setSelectedCols(new Set())
    setIsExtracting(false)
    setExtractData(null)
    setExtractError(null)
    setCurrentExtractionId(null)
  }

  const handleHistorySelect = (item: any) => {
    setUploadedImage(item.image_url || null)
    setExtractData(item.data || null)
    setSelectedRows(new Set(Array.isArray(item.rows_selected) ? item.rows_selected : []))
    setSelectedCols(new Set(Array.isArray(item.cols_selected) ? item.cols_selected : []))
    setCurrentExtractionId(item.id || null)
    setPrefillColumns(Array.isArray(item.columns) ? item.columns : undefined)
    setPrefillAIInstruction(typeof item.ai_instruction === 'string' ? item.ai_instruction : undefined)
    setDataSelected(true)
    setCurrentStep("extract")
    setHistoryOpen(false)
    setTimeout(() => {
      extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
  }

  const handleImageUpload = (image: string) => {
    setUploadedImage(image)
    setDataSelected(false)
    setCurrentStep("select")
    // Save history entry immediately on upload - this creates the history record
    ;(async () => {
      try {
        console.log("[Page] Starting history save process...")
        const supabase = getSupabaseClient()
        
        console.log("[Page] Getting user...")
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          // Silently handle missing session errors - they're expected when not logged in
          if (userError.message?.includes('Auth session missing') || userError.name === 'AuthSessionMissingError') {
            console.warn("[Page] No user found, skipping history save")
            toast.warning("Not signed in. History will not be saved. Please sign in to save your extractions.")
            return
          }
          console.error("[Page] Failed to get user:", userError)
          toast.error(`Authentication error: ${userError.message}. History will not be saved.`)
          return
        }
        
        if (!user) {
          console.warn("[Page] No user found, skipping history save")
          toast.warning("Not signed in. History will not be saved. Please sign in to save your extractions.")
          return
        }
        
        console.log("[Page] User found:", user.id)
        
        // Don't truncate image URLs - store full URL for preview
        // If it's too long, we'll handle it differently (maybe store in Supabase Storage later)
        let imageUrl = image || null
        // Note: PostgreSQL text fields can handle up to ~1GB, so we should be fine
        // But if there are issues, we can implement Supabase Storage later
        
        const payload = {
          user_id: user.id,
          image_url: imageUrl,
          rows_selected: [],
          cols_selected: [],
          data: {}, // Use empty object instead of null to satisfy NOT NULL constraint
          columns: [],
          ai_instruction: "",
        }
        
        console.log("[Page] Saving history entry on image upload...", { 
          user_id: user.id, 
          has_image: !!image,
          image_length: image?.length || 0,
          payload_image_length: imageUrl?.length || 0
        })
        
        const { data: inserted, error } = await supabase
          .from("extractions")
          .insert(payload)
          .select("id,created_at,image_url")
          .single()
        
        if (error) {
          console.error("[Page] Failed to save history entry:", error)
          console.error("[Page] Error code:", error.code)
          console.error("[Page] Error message:", error.message)
          console.error("[Page] Error details:", JSON.stringify(error, null, 2))
          
          // Show user-friendly error message
          let errorMsg = "Failed to save history entry"
          if (error.code === '23505') {
            errorMsg = "History entry already exists"
          } else if (error.code === '42501') {
            errorMsg = "Permission denied. Check RLS policies."
          } else if (error.message) {
            errorMsg = `Failed to save: ${error.message}`
          }
          
          toast.error(errorMsg)
          return
        }
        
        if (inserted?.id) {
          console.log("[Page] ✅ History entry saved successfully:", { 
            id: inserted.id, 
            created_at: inserted.created_at,
            has_image: !!inserted.image_url 
          })
          setCurrentExtractionId(String(inserted.id))
          
          // Trigger history sidebar refresh
          setHistoryRefreshTrigger(prev => prev + 1)
          
          // Show a toast to confirm history was saved
          toast.success("Image uploaded and saved to history")
        } else {
          console.warn("[Page] History entry insert returned no ID")
          toast.warning("History entry created but no ID returned")
        }
      } catch (err: any) {
        console.error("[Page] Exception saving history on upload:", err)
        console.error("[Page] Exception stack:", err?.stack)
        toast.error(`Error saving history: ${err?.message || 'Unknown error'}`)
      }
    })()
    setTimeout(() => {
      selectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
  }

  const handleDataSelected = (selected: boolean) => {
    setDataSelected(selected)
    if (selected) {
      // If extraction is already in progress, just navigate to extract page to show loading
      if (isExtracting) {
        setCurrentStep("extract")
        setTimeout(() => {
          extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 300)
        return
      }
      setCurrentStep("extract")
      setTimeout(() => {
        extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    }
  }

  // Persist row/col selections to history
  useEffect(() => {
    if (!currentExtractionId) return
    const rows = Array.from(selectedRows)
    const cols = Array.from(selectedCols)
    supabase
      .from("extractions")
      .update({ rows_selected: rows, cols_selected: cols })
      .eq("id", currentExtractionId)
      .then(() => {})
  }, [selectedRows, selectedCols, currentExtractionId])

  // Persist extracted data to history when available
  useEffect(() => {
    if (!currentExtractionId) return
    if (extractData === null || extractData === undefined) return
    supabase
      .from("extractions")
      .update({ data: extractData })
      .eq("id", currentExtractionId)
      .then(() => {})
  }, [extractData, currentExtractionId])

  return (
    <main className="h-screen bg-gradient-to-br from-[#1a1a2e] via-[#0f1419] to-[#1a1a2e] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header removed for desktop app UX */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        <AuthButton />
      </motion.div>

      {/* Create User button - top left (admin only, upload section only) */}
      {isAdminUser && currentStep === "upload" && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <Link
            href="/signup"
            className="fixed top-3 left-3 z-50 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-semibold text-sm transition shadow-lg flex items-center gap-2 border border-yellow-400/30"
            title="Create New User Account"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Create User</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </motion.div>
      )}

      {/* Logo/Image at top center (upload page only) */}
      {currentStep === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="fixed top-2 sm:top-3 md:top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <img 
            src="/image-removebg-preview.png" 
            alt="Logo" 
            className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain rounded-lg border-2 border-white/20 shadow-lg"
          />
        </motion.div>
      )}

      {/* History toggle button on the left */}
      <motion.button
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
        onClick={() => setHistoryOpen((v) => !v)}
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/15 transition shadow-2xl"
        title="History"
      >
        <History className="w-5 h-5" />
      </motion.button>

      {/* Floating history sidebar */}
      <HistorySidebar 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        onSelect={handleHistorySelect}
        refreshTrigger={historyRefreshTrigger}
      />
      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 z-40 bg-black/0"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex-1 overflow-hidden">
        {/* Upload Section */}
        {currentStep === "upload" && (
          <div ref={uploadSectionRef} className="h-full w-full flex items-center animate-fade-in">
            <Hero onImageUpload={handleImageUpload} />
          </div>
        )}

        {/* Select Data Section */}
        {currentStep === "select" && uploadedImage && (
          <div ref={selectSectionRef} className="h-full w-full py-8 px-4 sm:px-6 lg:px-8 overflow-auto animate-fade-in">
            <div className="w-full max-w-7xl mx-auto">
              <SelectionPanel
                imageUrl={uploadedImage}
                selectedRows={selectedRows}
                selectedCols={selectedCols}
                onRowSelect={setSelectedRows}
                onColSelect={setSelectedCols}
                onDataSelected={handleDataSelected}
                onUploadNew={handleNewUpload}
                extractionId={currentExtractionId}
                prefillColumns={prefillColumns as any}
                prefillAIInstruction={prefillAIInstruction}
                isExtracting={isExtracting}
                onStartExtract={() => {
                  setIsExtracting(true)
                  setExtractError(null)
                  setExtractData(null)
                }}
                onExtractResult={(data: any) => {
                  console.log("[Page] Extraction result received:", data)
                  setIsExtracting(false)
                  setExtractError(null)
                  setExtractData(data)
                }}
                onExtractError={(message: string) => {
                  setIsExtracting(false)
                  if (!extractData) {
                    setExtractError(message)
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Extracted Data Section */}
        {currentStep === "extract" && dataSelected && (
          <div
            ref={extractSectionRef}
            className="h-full w-full py-8 px-4 sm:px-6 lg:px-8 overflow-auto animate-fade-in"
          >
            <div className="w-full max-w-7xl mx-auto">
              <ExtractedDataPanel
                imageUrl={uploadedImage}
                selectedRows={selectedRows}
                selectedCols={selectedCols}
                extractionId={currentExtractionId}
                onUploadNew={handleNewUpload}
                loading={isExtracting}
                data={extractData}
                error={extractError}
              />
            </div>
          </div>
        )}
      </div>

      {userEmail && (
        <FloatingNavbar
          currentStep={currentStep}
          onStepChange={handleStepChange}
          isImageUploaded={!!uploadedImage}
          isDataSelected={dataSelected}
        />
      )}
    </main>
  )
}
