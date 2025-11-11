"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Column {
  id: string
  name: string
  instruction?: string
  rowCount?: number
}

interface ColumnCustomizerProps {
  onColumnsChange: (columns: Column[]) => void
  aiInstruction: string
  onAIInstructionChange: (instruction: string) => void
  initialColumns?: Column[]
  initialAIInstruction?: string
}

export default function ColumnCustomizer({
  onColumnsChange,
  aiInstruction,
  onAIInstructionChange,
  initialColumns,
  initialAIInstruction,
}: ColumnCustomizerProps) {
  const defaultColumns: Column[] = [
    { id: "1", name: "Column A", instruction: "", rowCount: 5 },
    { id: "2", name: "Column B", instruction: "", rowCount: 5 },
    { id: "3", name: "Column C", instruction: "", rowCount: 5 },
    { id: "4", name: "Column D", instruction: "", rowCount: 5 },
  ]

  const [columns, setColumns] = useState<Column[]>(initialColumns || defaultColumns)

  const [expandedColumn, setExpandedColumn] = useState<string>("1")

  // Sync with external updates (e.g., from template selection)
  useEffect(() => {
    if (initialColumns && JSON.stringify(initialColumns) !== JSON.stringify(columns)) {
      setColumns(initialColumns)
      onColumnsChange(initialColumns)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialColumns])

  useEffect(() => {
    if (initialAIInstruction !== undefined && initialAIInstruction !== aiInstruction) {
      onAIInstructionChange(initialAIInstruction)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAIInstruction])

  const handleNameChange = (id: string, newName: string) => {
    const updated = columns.map((col) => (col.id === id ? { ...col, name: newName } : col))
    setColumns(updated)
    onColumnsChange(updated)
  }

  const handleInstructionChange = (id: string, newInstruction: string) => {
    const updated = columns.map((col) => (col.id === id ? { ...col, instruction: newInstruction } : col))
    setColumns(updated)
    onColumnsChange(updated)
  }

  const handleAddColumn = () => {
    const newId = String(Math.max(...columns.map((c) => Number.parseInt(c.id)), 0) + 1)
    const newColumn = {
      id: newId,
      name: `Column ${String.fromCharCode(64 + columns.length + 1)}`,
      instruction: "",
      rowCount: 5,
    }
    const updated = [...columns, newColumn]
    setColumns(updated)
    onColumnsChange(updated)
  }

  const handleDeleteColumn = (id: string) => {
    if (columns.length > 1) {
      const updated = columns.filter((col) => col.id !== id)
      setColumns(updated)
      onColumnsChange(updated)
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <h4 className="text-white font-semibold text-sm flex-shrink-0">Customize Columns</h4>

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence>
          {columns.map((col, idx) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition"
            >
              {/* Header - Always visible, clickable to expand */}
              <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition">
                <button
                  onClick={() => setExpandedColumn(expandedColumn === col.id ? "" : col.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <span className="text-xs text-gray-400 font-medium min-w-6">{idx + 1}.</span>
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">{col.name}</div>
                    {col.instruction && <div className="text-xs text-gray-400 truncate">{col.instruction}</div>}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteColumn(col.id)
                    }}
                    disabled={columns.length === 1}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Column"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedColumn(expandedColumn === col.id ? "" : col.id)}
                    className="p-1 hover:bg-white/5 rounded transition"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-yellow-400 transition-transform ${
                        expandedColumn === col.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedColumn === col.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10 bg-white/2 px-4 py-4 space-y-4"
                  >
                    {/* Column Name Input */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-medium">Column Name</label>
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleNameChange(col.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-yellow-400 transition"
                        placeholder="e.g., Full Name"
                      />
                    </div>

                    {/* Column Instruction Input */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-medium">Extraction Instruction</label>
                      <textarea
                        value={col.instruction || ""}
                        onChange={(e) => handleInstructionChange(col.id, e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-yellow-400 transition resize-none h-20"
                        placeholder="e.g., Extract the full name from this field"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Column Button inside list */}
        <button
          onClick={handleAddColumn}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 hover:border-yellow-400 text-yellow-400 rounded text-sm font-medium transition flex items-center justify-center gap-2 sticky bottom-0 backdrop-blur-sm"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>

      <div className="flex-shrink-0 flex flex-col pt-2 border-t border-white/10">
        <label className="text-white font-semibold text-xs mb-2 flex-shrink-0 uppercase tracking-wide">
          AI Instruction
        </label>
        <textarea
          value={aiInstruction}
          onChange={(e) => onAIInstructionChange(e.target.value)}
          placeholder="e.g., Extract company name and email from each row..."
          className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-yellow-400 transition resize-none h-24"
        />
      </div>
    </div>
  )
}
