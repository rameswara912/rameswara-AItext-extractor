"use client"

import { useState } from "react"
import Image from "next/image"
import { Copy, Download } from "lucide-react"

interface ExtractedDataPanelProps {
  imageUrl: string
  selectedRows: Set<number>
  selectedCols: Set<number>
  onUploadNew: () => void
}

export default function ExtractedDataPanel({
  imageUrl,
  selectedRows,
  selectedCols,
  onUploadNew,
}: ExtractedDataPanelProps) {
  const [copied, setCopied] = useState(false)

  const extractedData = [
    ["Product", "Q1 Sales", "Q2 Sales", "Q3 Sales"],
    ["Electronics", "$45,000", "$52,000", "$48,000"],
    ["Clothing", "$32,000", "$41,000", "$39,000"],
    ["Home & Garden", "$28,000", "$35,000", "$42,000"],
    ["Sports", "$18,000", "$22,000", "$25,000"],
  ]

  const copyToClipboard = () => {
    let text = ""
    extractedData.forEach((row, rowIdx) => {
      if (selectedRows.size === 0 || selectedRows.has(rowIdx)) {
        const rowText = row
          .map((cell, colIdx) => (selectedCols.size === 0 || selectedCols.has(colIdx) ? cell : ""))
          .filter((cell) => cell)
          .join("\t")
        text += rowText + "\n"
      }
    })
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white text-2xl md:text-3xl font-bold">Extracted Data</h2>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Table - Takes 2 columns */}
        <div className="lg:col-span-2 glass p-6 glow-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {extractedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`border-b border-white/10 transition ${
                      selectedRows.size === 0 || selectedRows.has(rowIdx) ? "bg-yellow-500/10" : "bg-white/5 opacity-50"
                    }`}
                  >
                    {row.map((cell, colIdx) => (
                      <td
                        key={`${rowIdx}-${colIdx}`}
                        className={`px-4 py-3 text-sm transition ${
                          selectedCols.size === 0 || selectedCols.has(colIdx) ? "text-white" : "text-white/30"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition font-semibold ${
                copied ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              }`}
            >
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Right Sidebar - Image and Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Image Thumbnail */}
          <div className="glass p-4 glow-border">
            <h3 className="text-yellow-400 font-semibold mb-3 text-xs uppercase tracking-wider">Source Image</h3>
            <div className="relative w-full bg-white/5 rounded-lg overflow-hidden aspect-square">
              {imageUrl && <Image src={imageUrl || "/placeholder.svg"} alt="Source" fill className="object-contain" />}
            </div>
          </div>

          {/* Stats */}
          <div className="glass p-4 glow-border space-y-4">
            <div className="text-center">
              <p className="text-yellow-400 font-bold text-2xl">{selectedRows.size || extractedData.length}</p>
              <p className="text-white/60 text-xs uppercase tracking-wider">Rows Selected</p>
            </div>
            <div className="border-t border-white/10 pt-4 text-center">
              <p className="text-yellow-400 font-bold text-2xl">{selectedCols.size || extractedData[0]?.length || 0}</p>
              <p className="text-white/60 text-xs uppercase tracking-wider">Columns Selected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
