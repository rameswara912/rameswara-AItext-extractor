"use client"

import { Send, Download } from "lucide-react"

interface ActionsProps {
  rowCount: number
  colCount: number
  selectedRowsCount: number
  selectedColsCount: number
}

export default function Actions({ rowCount, colCount, selectedRowsCount, selectedColsCount }: ActionsProps) {
  const totalSelected = selectedRowsCount * selectedColsCount

  return (
    <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="glass p-8 glow-border">
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {[
              { label: "Rows Selected", value: selectedRowsCount, total: rowCount },
              { label: "Columns Selected", value: selectedColsCount, total: colCount },
              { label: "Total Cells", value: totalSelected, total: rowCount * colCount },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-white/60 text-sm mb-2">{stat.label}</p>
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-white/40 text-xs mt-1">of {stat.total} total</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition glow-border group">
              <Send className="w-5 h-5 group-hover:translate-x-1 transition" />
              Send to n8n
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition group">
              <Download className="w-5 h-5 group-hover:translate-y-1 transition" />
              Download Excel
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
