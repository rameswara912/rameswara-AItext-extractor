"use client"

import { useState } from "react"
import Image from "next/image"

interface PreviewProps {
  imageUrl: string
  selectedRows: Set<number>
  selectedCols: Set<number>
  onRowSelect: (rows: Set<number>) => void
  onColSelect: (cols: Set<number>) => void
}

export default function Preview({ imageUrl, selectedRows, selectedCols, onRowSelect, onColSelect }: PreviewProps) {
  const rows = 5
  const cols = 4
  const [selectMode, setSelectMode] = useState<"all" | "rows" | "cols">("all")

  const toggleRow = (row: number) => {
    const newRows = new Set(selectedRows)
    if (newRows.has(row)) {
      newRows.delete(row)
    } else {
      newRows.add(row)
    }
    onRowSelect(newRows)
  }

  const toggleCol = (col: number) => {
    const newCols = new Set(selectedCols)
    if (newCols.has(col)) {
      newCols.delete(col)
    } else {
      newCols.add(col)
    }
    onColSelect(newCols)
  }

  const selectAll = () => {
    onRowSelect(new Set(Array.from({ length: rows }, (_, i) => i)))
    onColSelect(new Set(Array.from({ length: cols }, (_, i) => i)))
  }

  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-8">Select Data</h2>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Preview Column */}
          <div className="lg:col-span-2 glass p-6 glow-border">
            <div className="relative w-full bg-white/5 rounded-lg overflow-hidden aspect-video mb-4">
              {imageUrl && (
                <Image src={imageUrl || "/placeholder.svg"} alt="Uploaded table" fill className="object-contain" />
              )}
            </div>
            <p className="text-white/60 text-sm">Preview of your table image</p>
          </div>

          {/* Selection Panel */}
          <div className="glass p-6 glow-border">
            <h3 className="text-yellow-400 font-semibold mb-4">Selection Mode</h3>
            <div className="space-y-3 mb-6">
              {(["all", "rows", "cols"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={selectMode === mode}
                    onChange={() => setSelectMode(mode)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-white capitalize">{mode === "all" ? "Select All" : `Select ${mode}`}</span>
                </label>
              ))}
            </div>

            <button
              onClick={selectAll}
              className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition glow-border"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Detailed Selection Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Rows */}
          <div className="glass p-6 glow-border">
            <h3 className="text-yellow-400 font-semibold mb-4">
              Rows ({selectedRows.size}/{rows})
            </h3>
            <div className="space-y-2">
              {Array.from({ length: rows }, (_, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(i)}
                    onChange={() => toggleRow(i)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition">Row {i + 1}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="glass p-6 glow-border">
            <h3 className="text-yellow-400 font-semibold mb-4">
              Columns ({selectedCols.size}/{cols})
            </h3>
            <div className="space-y-2">
              {Array.from({ length: cols }, (_, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedCols.has(i)}
                    onChange={() => toggleCol(i)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-white/80 group-hover:text-white transition">
                    Column {String.fromCharCode(65 + i)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
