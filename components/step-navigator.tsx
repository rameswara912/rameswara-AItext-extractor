"use client"

import { ChevronRight } from "lucide-react"

interface StepNavigatorProps {
  currentStep: number
  onStepChange: (step: number) => void
  isDataSelected: boolean
  hasImage: boolean
}

const steps = [
  { id: 1, label: "Upload", icon: "📤" },
  { id: 2, label: "Select Data", icon: "🎯" },
  { id: 3, label: "Extracted Data", icon: "📊" },
]

export default function StepNavigator({ currentStep, onStepChange, isDataSelected, hasImage }: StepNavigatorProps) {
  const handleStepClick = (stepId: number) => {
    // Only allow navigation to completed or current steps
    if (stepId <= currentStep || (stepId === 2 && hasImage) || (stepId === 3 && isDataSelected)) {
      onStepChange(stepId)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e] to-[#1a1a2e]/80 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8">
          {steps.map((step, index) => {
            const isActive = currentStep >= step.id
            const isDisabled = (step.id === 2 && !hasImage) || (step.id === 3 && !isDataSelected)
            const isCurrent = currentStep === step.id

            return (
              <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-[#1a1a2e] shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                      : isActive
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-white/5 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <span className="text-lg">{step.icon}</span>
                  <span className="hidden sm:inline font-medium text-sm">{step.label}</span>
                </button>

                {/* Connector line - hide on small screens */}
                {index < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-8 h-0.5 transition-all duration-300 ${
                      isActive ? "bg-yellow-400" : "bg-white/10"
                    }`}
                  />
                )}

                {/* Mobile connector - show only on small screens */}
                {index < steps.length - 1 && (
                  <ChevronRight size={16} className={`sm:hidden ${isActive ? "text-yellow-400" : "text-white/30"}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
