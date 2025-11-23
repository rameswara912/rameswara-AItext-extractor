"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "../lib/supabase"
import ImagePreview from "./image-preview"
import ColumnCustomizer from "./column-customizer"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
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
  extractionId?: string | null
  prefillColumns?: Column[]
  prefillAIInstruction?: string
  isExtracting?: boolean
}

interface Column {
  id: string
  name: string
  instruction?: string
  rowCount?: number
}

interface Template {
  id: string
  name: string
  columns: Column[]
  aiInstruction: string
  createdAt: string
}

interface TemplateRow {
  id: string
  user_id?: string
  name: string
  columns: Column[]
  ai_instruction: string
  created_at: string
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
  const { data: userRes, error: userError } = await supabase.auth.getUser()
  // Silently handle missing session errors - they're expected when not logged in
  if (userError && (userError.message?.includes('Auth session missing') || userError.name === 'AuthSessionMissingError')) {
    // Return empty templates when not logged in
    return []
  }
  const userId = userRes?.user?.id
  const query = supabase
    .from("templates")
    .select("id,name,columns,ai_instruction,created_at")
    .order("created_at", { ascending: false })
  const { data, error } = userId ? await query.eq("user_id", userId) : await query

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
  const { data: userRes, error: userError } = await supabase.auth.getUser()
  // Silently handle missing session errors - they're expected when not logged in
  if (userError && (userError.message?.includes('Auth session missing') || userError.name === 'AuthSessionMissingError')) {
    return false
  }
  const userId = userRes?.user?.id
  if (!userId) {
    console.error("Failed to save template: no authenticated user")
    return false
  }
  const { error } = await supabase.from("templates").insert({
    user_id: userId,
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
  extractionId,
  prefillColumns,
  prefillAIInstruction,
  isExtracting,
}: SelectionPanelProps) {
  const [selectMode, setSelectMode] = useState<"all" | "cols">("cols")
  const [columns, setColumns] = useState<Column[]>([])
  const [aiInstruction, setAIInstruction] = useState("")
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateColumns, setTemplateColumns] = useState<Column[] | undefined>(undefined)
  const [templateAIInstruction, setTemplateAIInstruction] = useState<string | undefined>(undefined)
  const [showSaveNameModal, setShowSaveNameModal] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState("")

  // Load templates from Supabase on mount
  useEffect(() => {
    (async () => {
      const loaded = await fetchTemplatesFromSupabase()
      setTemplates(loaded)
    })()
  }, [])

  // Apply prefill from history selection
  useEffect(() => {
    if (prefillColumns && prefillColumns.length > 0) {
      const mapped = prefillColumns.map((col, idx) => ({ ...col, id: String(idx + 1) }))
      setTemplateColumns(mapped)
      setColumns(mapped)
    }
    if (typeof prefillAIInstruction === 'string') {
      setTemplateAIInstruction(prefillAIInstruction)
      setAIInstruction(prefillAIInstruction)
    }
  }, [prefillColumns, prefillAIInstruction])

  const handleColumnsChange = (newColumns: Column[]) => {
    setColumns(newColumns)
    if (extractionId) {
      const supabase = getSupabaseClient()
      const mapped = newColumns.map((c, idx) => ({ ...c, id: String(idx + 1) }))
      supabase
        .from('extractions')
        .update({ columns: mapped })
        .eq('id', extractionId)
        .then(({ error }) => { if (error) console.warn('Failed to persist columns:', error.message) })
    }
  }

  const handleAIInstructionChange = (instruction: string) => {
    setAIInstruction(instruction)
    if (extractionId) {
      const supabase = getSupabaseClient()
      supabase
        .from('extractions')
        .update({ ai_instruction: instruction })
        .eq('id', extractionId)
        .then(({ error }) => { if (error) console.warn('Failed to persist AI instruction:', error.message) })
    }
  }

  const handleExtractData = async () => {
    if (isExtracting) {
      toast.error("An extraction is already in progress. Please wait.")
      return
    }
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
      // NO TIMEOUT - Just wait for the response from the server
      // The server will handle timeouts, we just wait for whatever response comes back
      console.log("[extract] Starting extraction, waiting for response (no client timeout - will wait for server response)...")
      
      // Fetch without any timeout or abort signal - just wait
      const res = await fetch(webhookUrl, {
        method: "POST",
        body: form,
        // NO signal - we don't abort, we just wait
      })

      console.log("[extract] Received response, status:", res.status, "ok:", res.ok)

      // Read the response body once (can only be read once)
      // Try to parse the response regardless of status code
      // Sometimes n8n returns data even with non-200 status
      let data: any = null
      const contentType = res.headers.get("content-type") || ""
      
      try {
        // Clone the response so we can read it multiple times if needed
        const responseText = await res.text()
        console.log("[extract] Response text length:", responseText.length, "first 200 chars:", responseText.substring(0, 200))
        
        if (contentType.includes("application/json") || responseText.trim().startsWith("{")) {
          try {
            data = JSON.parse(responseText)
          } catch (parseError) {
            console.error("[extract] Failed to parse as JSON:", parseError)
            data = { error: responseText.substring(0, 500) }
          }
        } else {
          // Not JSON, try to parse anyway
          try {
            data = JSON.parse(responseText)
          } catch {
            // Not JSON, treat as error
            data = { error: responseText.substring(0, 500) }
          }
        }
      } catch (readError) {
        console.error("[extract] Failed to read response:", readError)
        data = { error: "Failed to read response from server" }
      }

      console.log("[extract] Parsed response data:", { 
        status: res.status, 
        hasData: !!data, 
        hasError: !!data?.error,
        keys: data ? Object.keys(data) : []
      })

      // Check if we have valid data first, regardless of status code
      // Sometimes n8n returns data even with non-200 status
      const hasValidData = data && 
        !data.error && 
        !data.message && 
        (data.combinedRecords || 
         data.records || 
         data.data || 
         Array.isArray(data) ||
         (typeof data === 'object' && Object.keys(data).length > 0 && !data.error))
      
      if (hasValidData) {
        console.log("[extract] Valid data found in response, using it regardless of status code")
        onExtractResult?.(data)
        toast.success("Extraction completed successfully!")
        return
      }
      
      // If no valid data, check for errors
      if (!res.ok) {
        const status = res.status
        const errorMsg = data?.error || data?.message || "Extraction failed. Please try again."
        
        // Special handling for specific error cases
        let msg = errorMsg
        if (status === 404) {
          msg = "Extraction endpoint not found. Check WEBHOOK_URL configuration."
        } else if (status === 401 || status === 403) {
          msg = "Unauthorized to call extraction service. Verify access settings."
        } else if (status === 504) {
          msg = "Extraction timed out after 5 minutes. The process may still be running. Please try again or check n8n."
        } else if (status === 499) {
          msg = "Request was cancelled. Please try again."
        }
        
        // Use console.warn instead of console.error for expected API errors
        // These are handled gracefully in the UI, so they shouldn't trigger Next.js error overlay
        console.warn("[extract] Error response received:", { status, msg, data })
        onExtractError?.(msg)
        toast.error(msg)
        return
      }

      // Success response (res.ok === true)
      if (!data) {
        console.warn("[SelectionPanel] No data in response body")
        onExtractError?.("Extraction completed but no data was returned.")
        toast.error("No data returned from extraction")
        return
      }
      
      // Check if data contains an error field
      if (data.error || data.message) {
        const errorMsg = data.error || data.message
        // Use console.warn instead of console.error for expected API errors
        console.warn("[extract] Response contains error:", errorMsg)
        onExtractError?.(errorMsg)
        toast.error(errorMsg)
        return
      }
      
      // Success - we have data
      console.log("[extract] Successfully received data, passing to UI")
      onExtractResult?.(data)
      toast.success("Extraction completed successfully!")
      
    } catch (err: any) {
      // This catch block handles network errors and other exceptions
      // NO TIMEOUT HANDLING - we only show errors for actual network/connection failures
      const emsg = String(err?.message || "")
      console.error("[extract] Exception caught:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
        fullError: err
      })
      
      // Only show errors for actual network/connection failures
      // NOT for timeouts - we just wait
      let msg = "Extraction failed. Please try again."
      if (/fetch failed/i.test(emsg) || /ECONNREFUSED|ENOTFOUND/i.test(emsg) || /Failed to fetch/i.test(emsg)) {
        msg = "Cannot reach extraction service. Ensure n8n is running and WEBHOOK_URL is correct."
        console.error("[extract] Network error - cannot reach service:", emsg)
        onExtractError?.(msg)
        toast.error(msg)
      } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        // If somehow we get an abort/timeout error, just log it but don't show error to user
        // The server will eventually respond
        console.warn("[extract] Request was aborted/timed out, but continuing to wait for server response...")
        // Don't show error - just keep waiting
        return
      } else if (emsg) {
        msg = `Extraction failed: ${emsg}`
        console.error("[extract] Other error:", emsg)
        onExtractError?.(msg)
        toast.error(msg)
      }
    }
  }

  const handleSaveTemplate = async () => {
    // Ensure we're in "Select Cols" mode
    if (selectMode !== "cols") {
      toast.error("Please switch to 'Select Cols' mode and configure columns before saving a template.")
      setSelectMode("cols")
      return
    }

    if (columns.length === 0) {
      toast.error("Please add at least one column before saving a template.")
      return
    }

    if (!aiInstruction.trim()) {
      toast.error("Please enter an AI instruction before saving a template.")
      return
    }
    setShowSaveNameModal(true)
  }

  const handleConfirmSaveTemplate = async () => {
    const name = templateNameInput.trim()
    if (!name) {
      toast.error("Please enter a template name.")
      return
    }
    const ok = await saveTemplateToSupabase({
      name,
      columns,
      aiInstruction,
    })
    if (ok) {
      const loaded = await fetchTemplatesFromSupabase()
      setTemplates(loaded)
      setShowSaveNameModal(false)
      setTemplateNameInput("")
      toast.success(`Template "${name}" saved successfully!`)
    } else {
      toast.error("Failed to save template. Are you signed in?")
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

    // Persist selection to current extraction if available
    if (extractionId) {
      const supabase = getSupabaseClient()
      supabase
        .from('extractions')
        .update({ columns: mappedColumns, ai_instruction: template.aiInstruction })
        .eq('id', extractionId)
        .then(({ error }) => {
          if (error) console.warn('Failed to persist template to extraction:', error.message)
        })
    }
  }

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await deleteTemplateFromSupabase(id)
    if (ok) {
      const loaded = await fetchTemplatesFromSupabase()
      setTemplates(loaded)
      toast.success("Template deleted.")
    } else {
      toast.error("Failed to delete template. Are you signed in?")
    }
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header (not sticky, no dark background) */}
      <div className="flex items-center justify-start flex-shrink-0 bg-transparent py-2 px-1">
        <h2 className="text-white text-2xl md:text-3xl font-bold">Select Data</h2>
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
              className={`flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm transition shadow-lg hover:shadow-yellow-500/50 ${isExtracting ? "opacity-60 cursor-not-allowed" : ""}`}
              aria-disabled={!!isExtracting}
              title={isExtracting ? "Extraction in progress" : undefined}
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

      <AnimatePresence>
        {showSaveNameModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveNameModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass glow-border rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-yellow-400 font-semibold text-xl">Save Template</h3>
                  <button onClick={() => setShowSaveNameModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <label className="block text-sm text-white/80 mb-2">Template name</label>
                <input
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="Enter a name"
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowSaveNameModal(false)} className="flex-1 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/15 text-white rounded font-medium text-sm transition">
                    Cancel
                  </button>
                  <button onClick={handleConfirmSaveTemplate} className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm transition">
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
