"use client"

import { useState } from "react"
import ImagePreview from "./image-preview"
import ColumnCustomizer from "./column-customizer"
import { motion } from "framer-motion"
import { RotateCcw } from "lucide-react"

interface SelectionPanelProps {
  imageUrl: string
  selectedRows: Set<number>
  selectedCols: Set<number>
  onRowSelect: (rows: Set<number>) => void
  onColSelect: (cols: Set<number>) => void
  onDataSelected: (selected: boolean) => void
  onUploadNew: () => void
}

interface Column {
  id: string
  name: string
  instruction?: string
}

export default function SelectionPanel({ imageUrl, onDataSelected, onUploadNew }: SelectionPanelProps) {
  const [selectMode, setSelectMode] = useState<"all" | "cols">("all")
  const [columns, setColumns] = useState<Column[]>([])
  const [aiInstruction, setAIInstruction] = useState("")

  const handleColumnsChange = (newColumns: Column[]) => {
    setColumns(newColumns)
  }

  const handleExtractData = () => {
    onDataSelected(true)
    console.log("[v0] Extracting data:", { selectMode, columns, aiInstruction })
  }

  const handleSaveTemplate = () => {
    console.log("[v0] Saving template:", { columns, aiInstruction })
    // Template save logic will go here
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-white text-2xl md:text-3xl font-bold">Select Data</h2>
        <button
          onClick={onUploadNew}
          className="flex items-center gap-2 px-3 py-2 text-yellow-400 hover:text-yellow-300 text-sm transition"
        >
          <RotateCcw className="w-4 h-4" />
          New Upload
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        {/* Image Preview - Left Column */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <ImagePreview imageUrl={imageUrl} />
        </div>

        {/* Selection Mode - Right Columns */}
        <div className="lg:col-span-2 glass p-4 glow-border flex flex-col overflow-y-auto">
          {/* Selection Mode */}
          <div className="flex-shrink-0">
            <h3 className="text-yellow-400 font-semibold mb-3 text-lg">Selection Mode</h3>
            <div className="space-y-2 mb-6">
              {(["all", "cols"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    checked={selectMode === mode}
                    onChange={() => setSelectMode(mode)}
                    className="w-4 h-4 accent-yellow-400 cursor-pointer"
                  />
                  <span className="text-white text-sm capitalize font-medium group-hover:text-yellow-300 transition">
                    {mode === "all" ? "Select All" : `Select ${mode}`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Customization */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-h-0 overflow-y-auto">
            {selectMode === "cols" && (
              <ColumnCustomizer
                onColumnsChange={handleColumnsChange}
                aiInstruction={aiInstruction}
                onAIInstructionChange={setAIInstruction}
              />
            )}
          </motion.div>

          {/* Save Template and Extract buttons at the bottom */}
          <div className="flex gap-3 mt-4 flex-shrink-0 pt-4 border-t border-white/10">
            <button
              onClick={handleSaveTemplate}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/15 text-white rounded font-medium text-sm transition"
            >
              Save Template
            </button>
            <button
              onClick={handleExtractData}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm transition shadow-lg hover:shadow-yellow-500/50"
            >
              Extract
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
