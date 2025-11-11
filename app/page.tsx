"use client"

import { useState, useRef } from "react"
import Hero from "@/components/hero"
import SelectionPanel from "@/components/selection-panel"
import ExtractedDataPanel from "@/components/extracted-data-panel"
import FloatingNavbar from "@/components/floating-navbar"
import dynamic from "next/dynamic"
const HistorySidebar = dynamic(() => import("@/components/history-sidebar"), { ssr: false })
import { History } from "lucide-react"
const AuthButton = dynamic(() => import("@/components/auth-button"), { ssr: false })
import { getSupabaseClient } from "@/lib/supabase"

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

  const uploadSectionRef = useRef<HTMLDivElement>(null)
  const selectSectionRef = useRef<HTMLDivElement>(null)
  const extractSectionRef = useRef<HTMLDivElement>(null)

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
    setDataSelected(true)
    setCurrentStep("extract")
    setHistoryOpen(false)
    setTimeout(() => {
      extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
  }

  const handleImageUpload = (image: string) => {
    setUploadedImage(image)
    setCurrentStep("select")
    // Save minimal history entry immediately on upload
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const payload = {
          user_id: user.id,
          image_url: image || null,
          rows_selected: [],
          cols_selected: [],
          data: null,
        }
        const { data: inserted, error } = await supabase
          .from("extractions")
          .insert(payload)
          .select("id")
          .single()
        if (!error && inserted?.id) {
          setCurrentExtractionId(String(inserted.id))
        }
      } catch (_) {
        // non-blocking: ignore failures here; user can still proceed
      }
    })()
    setTimeout(() => {
      selectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
  }

  const handleDataSelected = (selected: boolean) => {
    setDataSelected(selected)
    if (selected) {
      setCurrentStep("extract")
      setTimeout(() => {
        extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 300)
    }
  }

  return (
    <main className="h-screen bg-gradient-to-br from-[#1a1a2e] via-[#0f1419] to-[#1a1a2e] relative overflow-auto flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Header removed for desktop app UX */}
      <AuthButton />

      {/* History toggle button on the left */}
      <button
        onClick={() => setHistoryOpen((v) => !v)}
        className="fixed left-3 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/15 transition shadow-2xl"
        title="History"
      >
        <History className="w-5 h-5" />
      </button>

      {/* Floating history sidebar */}
      <HistorySidebar open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={handleHistorySelect} />

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
                onStartExtract={() => {
                  setIsExtracting(true)
                  setExtractError(null)
                  setExtractData(null)
                }}
                onExtractResult={(data: any) => {
                  setIsExtracting(false)
                  setExtractData(data)
                }}
                onExtractError={(message: string) => {
                  setIsExtracting(false)
                  setExtractError(message)
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

      <FloatingNavbar
        currentStep={currentStep}
        onStepChange={handleStepChange}
        isImageUploaded={!!uploadedImage}
        isDataSelected={dataSelected}
      />
    </main>
  )
}
