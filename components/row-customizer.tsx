"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Column {
  id: string
  name: string
}

interface RowCustomizerProps {
  columns: Column[]
  onRowCountsChange: (counts: { [key: string]: number }) => void
}

export default function RowCustomizer({ columns, onRowCountsChange }: RowCustomizerProps) {
  const [rowCounts, setRowCounts] = useState<{ [key: string]: number }>({})
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current || columns.length === 0) return

    const initialCounts: { [key: string]: number } = {}
    columns.forEach((col) => {
      initialCounts[col.id] = 5
    })
    setRowCounts(initialCounts)
    initializedRef.current = true
  }, [columns.length])

  useEffect(() => {
    if (initializedRef.current && Object.keys(rowCounts).length > 0) {
      onRowCountsChange(rowCounts)
    }
  }, [rowCounts, onRowCountsChange])

  const handleRowCountChange = (colId: string, count: number) => {
    setRowCounts((prev) => ({
      ...prev,
      [colId]: Math.max(1, count),
    }))
  }

  const totalCells = Object.values(rowCounts).reduce((a, b) => a + b, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div>
        <h4 className="text-white font-semibold text-sm mb-3">Rows per Column</h4>
        <p className="text-xs text-gray-400 mb-3">Enter the number of rows needed for each column</p>
      </div>

      {/* Column Row Count Inputs */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {columns.map((col, idx) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition"
            >
              <span className="text-xs text-gray-400 min-w-12 font-medium">{idx + 1}.</span>
              <span className="flex-1 text-white text-sm truncate">{col.name}</span>
              <input
                type="number"
                value={rowCounts[col.id] || 5}
                onChange={(e) => handleRowCountChange(col.id, Number.parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="w-16 px-2 py-1 bg-white/10 border border-white/10 rounded text-white text-sm text-center focus:outline-none focus:border-yellow-400 transition"
              />
              <span className="text-xs text-gray-400">rows</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Summary */}
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="text-xs text-gray-300">
          <p className="mb-1">
            <span className="font-semibold text-yellow-400">{columns.length}</span> columns ×{" "}
            <span className="font-semibold text-yellow-400">{Math.ceil(totalCells / (columns.length || 1))}</span> rows
          </p>
          <p className="text-gray-400">
            Total cells: <span className="font-semibold text-yellow-400">{totalCells}</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
