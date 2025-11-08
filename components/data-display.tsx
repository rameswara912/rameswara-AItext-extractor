"use client"

import { useState } from "react"
import { ArrowLeft, Copy, Download } from "lucide-react"
import Image from "next/image"

interface DataDisplayProps {
  imageUrl: string
  selectedRows: Set<number>
  selectedCols: Set<number>
  onRowSelect: (rows: Set<number>) => void
  onColSelect: (cols: Set<number>) => void
}

export default function DataDisplay({
  imageUrl,
  selectedRows,
  selectedCols,
  onRowSelect,
  onColSelect,
}: DataDisplayProps) {
  const [copied, setCopied] = useState(false)

  // Mock extracted data from the image
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
    <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-white text-2xl md:text-3xl font-bold">Extracted Data</h2>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 px-4 py-2 text-yellow-400 hover:text-yellow-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Upload New
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Data Table */}
          <div className="lg:col-span-2 glass p-6 glow-border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {extractedData.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={`border-b border-white/10 transition ${
                        selectedRows.size === 0 || selectedRows.has(rowIdx)
                          ? "bg-yellow-500/10"
                          : "bg-white/5 opacity-50"
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

            <div className="mt-6 flex gap-3">
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition font-semibold ${
                  copied ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                }`}
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Data"}
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Image Preview */}
          <div className="glass p-6 glow-border">
            <h3 className="text-yellow-400 font-semibold mb-4">Image Preview</h3>
            <div className="relative w-full bg-white/5 rounded-lg overflow-hidden aspect-square mb-4">
              {imageUrl && (
                <Image src={imageUrl || "/placeholder.svg"} alt="Uploaded table" fill className="object-contain" />
              )}
            </div>
            <p className="text-white/60 text-xs">Extracted from your uploaded image</p>
          </div>
        </div>

        {/* Selection Stats */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { label: "Rows Extracted", value: extractedData.length },
            { label: "Columns Extracted", value: extractedData[0]?.length || 0 },
            { label: "Total Cells", value: (extractedData.length || 0) * (extractedData[0]?.length || 0) },
          ].map((stat) => (
            <div key={stat.label} className="glass p-4 glow-border text-center">
              <p className="text-white/60 text-sm mb-2">{stat.label}</p>
              <p className="text-2xl font-bold gradient-text">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
