"use client"

import { useState, useRef } from "react"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import SelectionPanel from "@/components/selection-panel"
import ExtractedDataPanel from "@/components/extracted-data-panel"
import FloatingNavbar from "@/components/floating-navbar"

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [dataSelected, setDataSelected] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set())
  const [currentStep, setCurrentStep] = useState<"upload" | "select" | "extract">("upload")

  const uploadSectionRef = useRef<HTMLDivElement>(null)
  const selectSectionRef = useRef<HTMLDivElement>(null)
  const extractSectionRef = useRef<HTMLDivElement>(null)

  const handleStepChange = (step: "upload" | "select" | "extract") => {
    setCurrentStep(step)

    if (step === "upload") {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      setUploadedImage(null)
      setDataSelected(false)
      setSelectedRows(new Set())
      setSelectedCols(new Set())
    } else if (step === "select" && uploadedImage) {
      selectSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    } else if (step === "extract" && dataSelected) {
      extractSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const handleImageUpload = (image: string) => {
    setUploadedImage(image)
    setCurrentStep("select")
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
    <main className="h-screen bg-gradient-to-br from-[#1a1a2e] via-[#0f1419] to-[#1a1a2e] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      <Navbar />

      <div className="relative z-10 flex-1 overflow-hidden">
        {/* Upload Section */}
        {currentStep === "upload" && (
          <div ref={uploadSectionRef} className="h-full w-full flex items-center animate-fade-in">
            {!uploadedImage ? <Hero onImageUpload={handleImageUpload} /> : <div className="w-full" />}
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
                onUploadNew={() => handleStepChange("upload")}
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
                onUploadNew={() => handleStepChange("upload")}
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
