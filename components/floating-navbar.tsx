"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Upload, BarChart3, Database } from "lucide-react"
import { useState, useEffect } from "react"

interface FloatingNavbarProps {
  currentStep: "upload" | "select" | "extract"
  onStepChange: (step: "upload" | "select" | "extract") => void
  isImageUploaded: boolean
  isDataSelected: boolean
}

export default function FloatingNavbar({
  currentStep,
  onStepChange,
  isImageUploaded,
  isDataSelected,
}: FloatingNavbarProps) {
  const [showSelectStep, setShowSelectStep] = useState(false)
  const [showExtractStep, setShowExtractStep] = useState(false)

  useEffect(() => {
    if (isImageUploaded) {
      setShowSelectStep(true)
    }
  }, [isImageUploaded])

  useEffect(() => {
    if (isDataSelected) {
      setShowExtractStep(true)
    }
  }, [isDataSelected])

  const steps = [
    {
      id: "upload",
      icon: Upload,
      color: "from-emerald-500 via-emerald-400 to-yellow-400",
    },
    {
      id: "select",
      icon: BarChart3,
      color: "from-green-500 via-emerald-400 to-yellow-400",
      show: showSelectStep,
    },
    {
      id: "extract",
      icon: Database,
      color: "from-yellow-400 via-yellow-500 to-green-500",
      show: showExtractStep,
    },
  ]

  // Only show visible steps; collapse container when single icon
  const visibleSteps = steps.filter((s) => s.show !== false)
  const compact = visibleSteps.length <= 1

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className={`rounded-full shadow-2xl ${compact ? "px-0 py-0 bg-transparent border-0 backdrop-blur-0" : "px-8 py-3 bg-black/50 border border-white/10 backdrop-blur-md"}`}>
          <div className={`flex items-center ${compact ? "gap-0" : "gap-6"}`}>
            <AnimatePresence mode="wait">
              {visibleSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={step.show !== false ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    onClick={() => onStepChange(step.id as any)}
                    className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                      currentStep === step.id
                        ? `bg-gradient-to-r ${step.color} shadow-lg shadow-emerald-500/40`
                        : "bg-black/30 hover:bg-black/40 text-white/80 hover:text-white"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <step.icon className="w-5 h-5" />

                    {currentStep === step.id && (
                      <motion.div
                        className={`absolute inset-0 rounded-full bg-gradient-to-r ${step.color} opacity-20 blur-lg`}
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      />
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
