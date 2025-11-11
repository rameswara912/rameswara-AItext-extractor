"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient, TemplateRow } from "../lib/supabase"
import ImagePreview from "./image-preview"
import ColumnCustomizer from "./column-customizer"
import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, FileText, X, ChevronRight } from "lucide-react"

interface SelectionPanelProps {
  imageUrl: string
  selectedRows: Set<number>
  selectedCols: Set<number>
  onRowSelect: (rows: Set<number>) => void
  onColSelect: (cols: Set<number>) => void  
  onDataSelected: (selected: boolean) => void
  onUploadNew: () => void
  onStartExtract?: () => void
  onExtractResult?: (data: any) => void
  onExtractError?: (message: string) => void
}

interface Column {
  id: string
  name: string
  instruction?: string
}

interface Template {
  id: string
  name: string
  columns: Column[]
  aiInstruction: string
  createdAt: string
}

// Supabase-backed template helpers
const mapRowToTemplate = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  columns: row.columns || [],
  aiInstruction: row.ai_instruction || "",
  createdAt: row.created_at,
})

const fetchTemplatesFromSupabase = async (): Promise<Template[]> => {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("templates")
    .select("id,name,columns,ai_instruction,created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load templates:", error)
    return []
  }
  return (data || []).map(mapRowToTemplate)
}

const saveTemplateToSupabase = async (
  template: Omit<Template, "id" | "createdAt">
): Promise<boolean> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("templates").insert({
    name: template.name,
    columns: template.columns,
    ai_instruction: template.aiInstruction,
  })
  if (error) {
    console.error("Failed to save template:", error)
    return false
  }
  return true
}

const deleteTemplateFromSupabase = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("templates").delete().eq("id", id)
  if (error) {
    console.error("Failed to delete template:", error)
    return false
  }
  return true
}

export default function SelectionPanel({
  imageUrl,
  onDataSelected,
  onUploadNew,
  onStartExtract,
  onExtractResult,
  onExtractError,
}: SelectionPanelProps) {
  const [selectMode, setSelectMode] = useState<"all" | "cols">("cols")
  const [columns, setColumns] = useState<Column[]>([])
  const [aiInstruction, setAIInstruction] = useState("")
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateColumns, setTemplateColumns] = useState<Column[] | undefined>(undefined)
  const [templateAIInstruction, setTemplateAIInstruction] = useState<string | undefined>(undefined)

  // Load templates from Supabase on mount
  useEffect(() => {
    (async () => {
      const loaded = await fetchTemplatesFromSupabase()
      setTemplates(loaded)
    })()
  }, [])

  const handleColumnsChange = (newColumns: Column[]) => {
    setColumns(newColumns)
    // Clear template state when user manually changes columns
    setTemplateColumns(undefined)
    setTemplateAIInstruction(undefined)
  }

  const handleAIInstructionChange = (instruction: string) => {
    setAIInstruction(instruction)
    // Clear template state when user manually changes AI instruction
    setTemplateAIInstruction(undefined)
  }

  const handleExtractData = async () => {
    // Move to extract section and show loading if provided
    onDataSelected(true)
    onStartExtract?.()

    // Send to our Next.js API route which proxies to n8n
    // This avoids hardcoding local webhook URLs and lets us handle
    // both JSON and multipart payloads server-side.
    const webhookUrl = "/api/extract"

    // Convert current image URL (data URL or http URL) to a Blob
    const dataUrlToBlob = async (url: string): Promise<Blob> => {
      if (url.startsWith("data:")) {
        const [meta, base64] = url.split(",")
        const mimeMatch = /data:(.*?);/.exec(meta)
        const mime = mimeMatch?.[1] || "image/png"
        const binary = atob(base64)
        const len = binary.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
        return new Blob([bytes], { type: mime })
      }
      const res = await fetch(url)
      return await res.blob()
    }

    const imageBlob = await dataUrlToBlob(imageUrl)
    const mime = imageBlob.type || "image/png"
    const ext = mime.split("/")[1] || "png"
    const fileName = `upload.${ext}`

    const form = new FormData()
    form.append("file", imageBlob, fileName)

    // Build exact body schema expected by n8n
    const columnsObject = Object.fromEntries(
      columns.map((c, i) => [
        `name${i + 1}`,
        c.name,
      ])
    )

    const bodyInner = {
      columns: columnsObject,
      mode: selectMode,
      payload: {
        columns: columns.map((c) => ({ name: c.name, instruction: c.instruction || "" })),
        ai_instruction: aiInstruction,
        mode: selectMode,
      },
    }

    // Send JSON in body as a plain text field so Webhook captures it under $json.body
    form.append("body", JSON.stringify(bodyInner))

    console.log("[extract] sending multipart form (exact): ", { fileName, mime, body: bodyInner })

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        body: form,
      })

      if (!res.ok) {
        const text = await res.text()
        // Provide a clearer message for common n8n misconfiguration
        const friendly = text.includes("Unused Respond to Webhook")
          ? "The n8n workflow has a 'Respond to Webhook' node that is not connected. Please connect it to the Webhook's response path or remove it."
          : text
        throw new Error(`Webhook error ${res.status}: ${friendly}`)
      }

      const data = await res.json().catch(() => null)
      onExtractResult?.(data ?? { message: "No JSON body returned" })
    } catch (err: any) {
      console.error("[extract] Failed:", err)
      onExtractError?.(err?.message || "Extraction failed")
    }
  }

  const handleSaveTemplate = async () => {
    // Ensure we're in "Select Cols" mode
    if (selectMode !== "cols") {
      alert("Please switch to 'Select Cols' mode and configure columns before saving a template.")
      setSelectMode("cols")
      return
    }

    if (columns.length === 0) {
      alert("Please add at least one column before saving a template.")
      return
    }

    if (!aiInstruction.trim()) {
      alert("Please enter an AI instruction before saving a template.")
      return
    }

    const templateName = prompt("Enter template name:")
    if (!templateName || !templateName.trim()) {
      return
    }

    const ok = await saveTemplateToSupabase({
      name: templateName.trim(),
      columns,
      aiInstruction,
    })
    if (ok) {
      const loaded = await fetchTemplatesFromSupabase()
      setTemplates(loaded)
      alert(`Template "${templateName}" saved successfully!`)
    } else {
      alert("Failed to save template. Are you signed in?")
    }
  }

  const handleSelectTemplate = (template: Template) => {
    // Map columns with proper IDs
    const mappedColumns = template.columns.map((col, idx) => ({
      ...col,
      id: String(idx + 1),
      rowCount: col.rowCount || 5,
    }))
    
    // Set template state (for ColumnCustomizer to sync via props)
    setTemplateColumns(mappedColumns)
    setTemplateAIInstruction(template.aiInstruction)
    
    // Also set direct state to ensure immediate update
    setColumns(mappedColumns)
    setAIInstruction(template.aiInstruction)
    
    // Ensure "Select Cols" mode is enabled
    setSelectMode("cols")
    
    // Close template selector modal
    setShowTemplateSelector(false)
  }

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this template?")) {
      const ok = await deleteTemplateFromSupabase(id)
      if (ok) {
        const loaded = await fetchTemplatesFromSupabase()
        setTemplates(loaded)
      } else {
        alert("Failed to delete template. Are you signed in?")
      }
    }
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header (not sticky, no dark background) */}
      <div className="flex items-center justify-between flex-shrink-0 bg-transparent py-2 px-1">
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0 overflow-hidden">
        {/* Image Preview - Left Column */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <ImagePreview imageUrl={imageUrl} />
        </div>

        {/* Selection Mode - Right Columns */}
        <div className="lg:col-span-2 glass p-4 glow-border flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Selection Mode */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-black/30 backdrop-blur pt-2 -mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-yellow-400 font-semibold text-lg">Select Columns</h3>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-3 py-1.5 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded font-medium transition flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                Use Template
              </button>
            </div>

            
          </div>

          {/* Dynamic Customization */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {selectMode === "cols" && (
              <ColumnCustomizer
                onColumnsChange={handleColumnsChange}
                aiInstruction={aiInstruction}
                onAIInstructionChange={handleAIInstructionChange}
                initialColumns={templateColumns}
                initialAIInstruction={templateAIInstruction}
              />
            )}
          </motion.div>

          {/* Save Template and Extract buttons at the bottom (compact on Select) */}
          <div className="flex gap-3 mt-2 flex-shrink-0 sticky bottom-0 z-10 bg-transparent pt-0">
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

      {/* Template Selector Modal */}
      <AnimatePresence>
        {showTemplateSelector && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateSelector(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass glow-border rounded-lg p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-yellow-400 font-semibold text-xl">Select a Template</h3>
                  <button
                    onClick={() => setShowTemplateSelector(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Template List */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {templates.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-sm text-center">
                        No templates saved yet. Configure columns and save a template first.
                      </p>
                    </div>
                  ) : (
                    <div 
                      className="overflow-x-auto h-full scrollbar-thin scrollbar-thumb-yellow-500/20 scrollbar-track-transparent"
                    >
                      <div className="flex gap-4 pb-4 px-1">
                        {templates.map((template) => (
                          <motion.div
                            key={template.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-shrink-0 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-yellow-400/50 rounded-lg p-4 min-w-[200px] max-w-[200px] transition group relative cursor-pointer shadow-lg"
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <button
                              onClick={(e) => handleDeleteTemplate(template.id, e)}
                              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition z-10 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            
                            <div className="pr-8">
                              <div className="text-white font-semibold text-base mb-2 truncate">{template.name}</div>
                              <div className="text-gray-300 text-xs mb-3 font-medium">
                                {template.columns.length} column{template.columns.length !== 1 ? "s" : ""}
                              </div>
                              
                              {/* Preview of columns */}
                              <div className="space-y-1.5 mb-3">
                                {template.columns.slice(0, 3).map((col, idx) => (
                                  <div key={idx} className="text-white/80 text-xs truncate font-medium">
                                    • {col.name}
                                  </div>
                                ))}
                                {template.columns.length > 3 && (
                                  <div className="text-white/70 text-xs font-medium">
                                    +{template.columns.length - 3} more
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 text-yellow-400 text-xs mt-3 pt-3 border-t border-white/20">
                                <span className="font-semibold">Click to Use</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
