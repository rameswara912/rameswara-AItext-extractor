"use client"

import { useMemo, useState, useEffect } from "react"
import Image from "next/image"
import { Copy, Download, FileText } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"

interface ExtractedDataPanelProps {
  imageUrl?: string | null
  selectedRows: Set<number>
  selectedCols: Set<number>
  extractionId?: string | null
  onUploadNew: () => void
  loading?: boolean
  data?: any
  error?: string | null
}

export default function ExtractedDataPanel({
  imageUrl,
  selectedRows,
  selectedCols,
  extractionId,
  onUploadNew,
  loading,
  data,
  error,
}: ExtractedDataPanelProps) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [headersOverride, setHeadersOverride] = useState<string[] | null>(null)

  // Convert filtered table data to Excel XML (SpreadsheetML 2003) and trigger download
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;")

  const buildFilteredTable = (data: string[][]): string[][] => {
    if (!data || data.length === 0) return [[]]
    const rowAllowed = (idx: number) => selectedRows.size === 0 || selectedRows.has(idx)
    const colAllowed = (idx: number) => selectedCols.size === 0 || selectedCols.has(idx)
    return data
      .map((row, rIdx) => row.filter((_, cIdx) => colAllowed(cIdx)))
      .filter((_, rIdx) => rowAllowed(rIdx))
  }

  const exportToExcel = (data2d: string[][]) => {
    const table = buildFilteredTable(data2d)
    const headers = table[0] || []
    const bodyRows = table.slice(1)

    // Normalize each row to match header length so cells align under columns
    const normalizeRow = (row: string[]): string[] => {
      if (!headers || headers.length === 0) return row
      if (row.length === headers.length) return row
      // If we have a single cell that appears concatenated, try common delimiters
      if (row.length === 1) {
        const raw = String(row[0] ?? "")
        const tryDelims = ["\t", ",", ";", "|", " | ", " : ", ":", " - "]
        for (const d of tryDelims) {
          const parts = raw.split(d).map((p) => p.trim()).filter((p) => p.length > 0)
          if (parts.length >= headers.length) {
            // If we have extra fragments and last header is 'remarks', merge leftovers into last cell
            if (String(headers[headers.length - 1]).toLowerCase() === "remarks" && parts.length > headers.length) {
              const head = parts.slice(0, headers.length - 1)
              const tail = parts.slice(headers.length - 1).join(" ")
              return [...head, tail]
            }
            return parts.slice(0, headers.length)
          }
        }
        // Heuristic: split by multiple spaces to separate columns
        const spaceParts = raw.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
        if (spaceParts.length >= headers.length) return spaceParts.slice(0, headers.length)
        // Fallback: pad to column count
        return [raw, ...Array(Math.max(0, headers.length - 1)).fill("")]
      }
      // If too many cells, trim; if too few, pad
      if (row.length > headers.length) {
        // Prefer merging extras into 'remarks'
        if (String(headers[headers.length - 1]).toLowerCase() === "remarks") {
          const head = row.slice(0, headers.length - 1)
          const tail = row.slice(headers.length - 1).join(" ")
          return [...head, tail]
        }
        return row.slice(0, headers.length)
      }
      return [...row, ...Array(Math.max(0, headers.length - row.length)).fill("")]
    }

    const stylesXml =
      `<Styles>` +
      // Header style: bold, centered, yellow background, black text
      `<Style ss:ID="Header">` +
      `<Font ss:Bold="1" ss:Color="#000000"/>` +
      `<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>` +
      `<Interior ss:Color="#FFC107" ss:Pattern="Solid"/>` +
      `</Style>` +
      // Text cell style: left aligned, subtle border
      `<Style ss:ID="CellText">` +
      `<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>` +
      `<Borders>` +
      `<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#333333"/>` +
      `</Borders>` +
      `</Style>` +
      // Warning text style: yellow text, bold
      `<Style ss:ID="CellWarnText">` +
      `<Font ss:Color="#FFC107" ss:Bold="1"/>` +
      `<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>` +
      `<Borders>` +
      `<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#333333"/>` +
      `</Borders>` +
      `</Style>` +
      // Number cell style: right aligned
      `<Style ss:ID="CellNumber">` +
      `<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>` +
      `<Borders>` +
      `<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#333333"/>` +
      `</Borders>` +
      `</Style>` +
      `</Styles>`

    const isNumeric = (val: any) => {
      if (val === null || val === undefined) return false
      const s = String(val).trim()
      const cleaned = s.replace(/[^0-9.\-]/g, "")
      if (!cleaned) return false
      const digits = cleaned.replace(/[^0-9]/g, "")
      if (digits.length >= 10) return false
      if (/^0\d+$/.test(cleaned)) return false
      return /^[-+]?\d+(?:\.\d+)?$/.test(cleaned)
    }

    const normalizedHeaders = normalizeRow(headers as string[])

    // Special mapping: if headers match the expected 7-column schema
    // [coverage, locality, apnany, narone, primafone, second, remarks]
    const headerNames = normalizedHeaders.map((h) => String(h).trim().toLowerCase())
    const isSevenColSchema =
      headerNames.length === 7 &&
      headerNames[0] === "coverage" &&
      headerNames[1] === "locality" &&
      headerNames[2] === "apnany" &&
      headerNames[3] === "narone" &&
      headerNames[4] === "primafone" &&
      headerNames[5] === "second" &&
      headerNames[6] === "remarks"

    const mapRowToSevenSchema = (row: string[]): string[] => {
      // Combine cells to a single text snapshot to parse consistently
      const raw = row.length === 1 ? String(row[0] ?? "") : row.map((c) => String(c ?? "")).join(" ")
      const src = raw.trim()

      // Extract up to 4 phone-like numbers (10-12 digits), normalize by stripping separators
      const phones: string[] = []
      const phoneRegex = /(?:\+?91[- ]*)?(\d[\d\- ]{9,13})/g
      let m: RegExpExecArray | null
      const consumed: { start: number; end: number }[] = []
      while ((m = phoneRegex.exec(src)) && phones.length < 4) {
        const cleaned = m[1].replace(/[^0-9]/g, "")
        // Prefer 10-12 digit sequences
        if (cleaned.length >= 10 && cleaned.length <= 12) {
          phones.push(cleaned)
          consumed.push({ start: m.index, end: m.index + m[0].length })
        }
      }

      // Build text without consumed phone segments
      let text = ""
      if (consumed.length === 0) {
        text = src
      } else {
        let last = 0
        for (const seg of consumed) {
          text += src.slice(last, seg.start)
          last = seg.end
        }
        text += src.slice(last)
      }
      text = text.replace(/\s+/g, " ").trim()

      // Derive coverage/locality from common separators
      let coverage = ""
      let locality = ""
      if (text.includes(":")) {
        const idx = text.indexOf(":")
        coverage = text.slice(0, idx).trim()
        locality = text.slice(idx + 1).trim()
      } else if (text.includes(" - ")) {
        const idx = text.indexOf(" - ")
        coverage = text.slice(0, idx).trim()
        locality = text.slice(idx + 3).trim()
      } else if (text.includes("|") || text.includes(";")) {
        const idxPipe = text.indexOf("|")
        const idxSemi = text.indexOf(";")
        const idx = [idxPipe, idxSemi].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? -1
        if (idx >= 0) {
          coverage = text.slice(0, idx).trim()
          locality = text.slice(idx + 1).trim()
        } else {
          coverage = text
        }
      } else {
        // If there are commas, prefer first segment as coverage and the rest as locality
        const parts = text.split(",").map((p) => p.trim()).filter(Boolean)
        if (parts.length > 1) {
          coverage = parts[0]
          locality = parts.slice(1).join(", ")
        } else {
          coverage = text
        }
      }

      // Assign phones to columns in order
      const apnany = phones[0] ?? ""
      const narone = phones[1] ?? ""
      const primafone = phones[2] ?? ""
      const second = phones[3] ?? ""

      // Remarks: anything beyond core text (none for now)
      const remarks = ""

      const mapped = [coverage, locality, apnany, narone, primafone, second, remarks]
      // Ensure exact length
      return mapped.length === normalizedHeaders.length ? mapped : normalizeRow(mapped)
    }

    const rowsXml = [normalizedHeaders, ...(isSevenColSchema ? bodyRows.map(mapRowToSevenSchema) : bodyRows.map(normalizeRow))]
      .map((row, rIdx) => {
        const cellsXml = row
          .map((cell) => {
            const val = String(cell ?? "")
            if (rIdx === 0) {
              return `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`
            }
            if (isNumeric(val)) {
              const cleaned = String(val).replace(/[^0-9.\-]/g, "")
              const num = parseFloat(cleaned)
              return `<Cell ss:StyleID=\"CellNumber\"><Data ss:Type=\"Number\">${Number.isFinite(num) ? num : 0}</Data></Cell>`
            }
            const flagged = /(not\s*clear|unclear|notclear)/i.test(val)
            if (flagged) {
              return `<Cell ss:StyleID="CellWarnText"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`
            }
            return `<Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`
          })
          .join("")
        return `<Row>${cellsXml}</Row>`
      })
      .join("")

    // Define columns so Excel renders a stable grid with styled alignment
    const columnsXml = normalizedHeaders
      .map(() => `<Column ss:AutoFitWidth="1" />`)
      .join("")

    const xml =
      `<?xml version="1.0"?>\n` +
      `<?mso-application progid="Excel.Sheet"?>\n` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
      stylesXml +
      `<Worksheet ss:Name="Extracted">` +
      `<Table ss:ExpandedColumnCount="${normalizedHeaders.length}" ss:ExpandedRowCount="${1 + bodyRows.length}">` +
      columnsXml +
      rowsXml +
      `</Table>` +
      `</Worksheet>` +
      `</Workbook>`

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "extracted-data.xls"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const saveExtractionToSupabase = async () => {
    try {
      setSaving(true)
      setSaveError(null)

      const supabase = getSupabaseClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      // Silently handle missing session errors - they're expected when not logged in
      if (userError && (userError.message?.includes('Auth session missing') || userError.name === 'AuthSessionMissingError')) {
        throw new Error("You must be signed in to save to Supabase")
      }

      if (!user) {
        throw new Error("You must be signed in to save to Supabase")
      }

      const updatePayload: any = {
        rows_selected: Array.from(selectedRows ?? []),
        cols_selected: Array.from(selectedCols ?? []),
        data: data ?? null,
      }

      // Include template info if available on the current extraction
      if (extractionId) {
        const { data: existing } = await supabase
          .from("extractions")
          .select("columns,ai_instruction")
          .eq("id", extractionId)
          .single()
        if (existing) {
          updatePayload.columns = existing.columns ?? []
          updatePayload.ai_instruction = existing.ai_instruction ?? ""
        }
      }

      if (extractionId) {
        const { error: updateError } = await supabase
          .from("extractions")
          .update(updatePayload)
          .eq("id", extractionId)
        if (updateError) throw updateError
      } else {
        const insertPayload = {
          user_id: user.id,
          image_url: imageUrl || null,
          ...updatePayload,
        }
        const { error: insertError } = await supabase.from("extractions").insert(insertPayload)
        if (insertError) throw insertError
      }
    } catch (e: any) {
      console.error("Failed to save extraction:", e)
      setSaveError(e?.message || "Failed to save extraction")
    } finally {
      setSaving(false)
    }
  }

  const handleExportAndSave = async (data2d: string[][]) => {
    // Kick off the download immediately for good UX
    exportToExcel(data2d)
    // Note: History is already saved when image is uploaded, so we just update the existing record
    // This ensures the data is persisted to the history entry created on upload
    if (extractionId) {
      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase
          .from("extractions")
          .update({ 
            data: data ?? null,
            rows_selected: Array.from(selectedRows ?? []),
            cols_selected: Array.from(selectedCols ?? []),
          })
          .eq("id", extractionId)
        if (error) {
          console.error("[ExtractedDataPanel] Failed to update history:", error)
        } else {
          console.log("[ExtractedDataPanel] History updated successfully")
        }
      } catch (err) {
        console.error("[ExtractedDataPanel] Error updating history:", err)
      }
    }
  }

  // Normalize JSON into a tabular shape when possible
  const tableData: string[][] | null = useMemo(() => {
    if (!data) {
      console.log("[ExtractedDataPanel] No data provided")
      return null
    }
    console.log("[ExtractedDataPanel] Received data:", data)

    const safeParse = (v: any): any => {
      if (typeof v === "string") {
        let t = v.trim()
        // If the string contains JSON preceded by a prefix like "json ", slice from first bracket
        const firstBrace = Math.min(
          ...["{", "["].map((ch) => {
            const i = t.indexOf(ch)
            return i === -1 ? Number.POSITIVE_INFINITY : i
          })
        )
        if (Number.isFinite(firstBrace) && firstBrace > 0) {
          t = t.slice(firstBrace).trim()
        }

        // Close common trailing commas in objects/arrays to help parsing
        const fixTrailingCommas = (s: string) => s.replace(/,\s*([}\]])/g, "$1")

        const tryJson = (s: string) => {
          const candidate = fixTrailingCommas(s)
          try {
            return JSON.parse(candidate)
          } catch (_) {
            const lastClose = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"))
            if (lastClose > 0) {
              try {
                return JSON.parse(candidate.slice(0, lastClose + 1))
              } catch (_) {}
            }
            return null
          }
        }

        if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
          const parsed = tryJson(t)
          if (parsed !== null) return parsed

          // Heuristic: convert single-quoted JSONish to valid JSON
          // 1) Quote unquoted keys and convert 'value' -> "value"
          let normalized = t
            // Quote object keys possibly wrapped in single or double quotes
            .replace(/(['"])?(\w+)\1\s*:/g, '"$2":')
            // Convert single-quoted string values to double-quoted
            .replace(/:\s*'([^']*)'/g, ': "$1"')
            // Convert booleans/null spelled without quotes
            .replace(/:\s*(true|false|null)\b/g, ': $1')

          const parsed2 = tryJson(normalized)
          if (parsed2 !== null) return parsed2

          return v
        }
      }
      return v
    }

    // If the top-level is a JSON string, parse it first
    data = safeParse(data)

    const toStr = (v: any) => String(v ?? "")

    const arrayToTable = (arr: any[]): string[][] => {
      if (!arr || arr.length === 0) return [[]]
      const first = arr[0]
      // Array of arrays -> assume already rows
      if (Array.isArray(first)) {
        return (arr as any[]).map((row) => row.map((cell: any) => toStr(cell)))
      }
      // Array of objects -> merge keys into headers
      if (typeof first === "object" && first !== null) {
        const headers: string[] = Array.from(
          arr.reduce((set: Set<string>, row: Record<string, any>) => {
            Object.keys(row || {}).forEach((k) => set.add(k))
            return set
          }, new Set<string>())
        )
        const rows = (arr as Record<string, any>[]).map((row) => headers.map((h: string) => toStr((row as Record<string, any>)[h])))
        return [headers, ...rows]
      }
      // Array of primitives -> single column
      return [["Value"], ...arr.map((v) => [toStr(v)])]
    }

    // Top-level array
    if (Array.isArray(data)) {
      console.log("[ExtractedDataPanel] Data is an array, length:", data.length)
      // Parse any stringified items
      const arr = (data as any[]).map((item) => safeParse(item))
      // Special-case: array wrapping a single object that contains records/data
      if (arr.length === 1 && typeof arr[0] === "object" && arr[0] !== null) {
        const wrapped = arr[0] as Record<string, any>
        const parsedWrapped: Record<string, any> = {}
        Object.entries(wrapped).forEach(([k, v]) => (parsedWrapped[k] = safeParse(v)))

        const preferredKeys = ["records", "data", "items", "rows", "result"]
        let arrayKey = preferredKeys.find((k) => Array.isArray(parsedWrapped[k]))
        if (!arrayKey) arrayKey = Object.keys(parsedWrapped).find((k) => Array.isArray(parsedWrapped[k]))
        if (arrayKey) {
          const colObj = parsedWrapped["columns"]
          if (colObj && typeof colObj === "object") {
            const names = Object.keys(colObj)
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
              .map((k) => String(colObj[k]))
              .filter(Boolean)

            const records = parsedWrapped[arrayKey] as Record<string, any>[]
            if (Array.isArray(records) && records.length > 0) {
              const getRowValues = (row: Record<string, any>, namesArr: string[], count: number): string[] => {
                const vals: string[] = []
                for (let i = 0; i < count; i++) {
                  const nameKey = namesArr[i]
                  const colKey = `column_${i + 1}`
                  const idxAlt = row[i] ?? row[String(i)]
                  const value = row?.[nameKey] ?? row?.[colKey] ?? idxAlt
                  vals.push(toStr(value))
                }
                return vals
              }

              const count = names.length || Object.keys(records[0] || {}).length
              const rows = records.map((row) => getRowValues(row, names, count))
              const headers = names.length > 0 ? names : Object.keys(records[0] || {})
              return [headers, ...rows]
            }
          }
          return arrayToTable(parsedWrapped[arrayKey])
        }
      }
      const result = arrayToTable(arr)
      console.log("[ExtractedDataPanel] Array converted to table, rows:", result.length)
      return result
    }

    // Top-level object: try to find an array property (e.g. records, data, items)
    if (typeof data === "object" && data !== null) {
      console.log("[ExtractedDataPanel] Data is an object, keys:", Object.keys(data))
      // Attempt to parse stringified JSON fields inside the object
      const parsedObj: Record<string, any> = {}
      Object.entries(data as Record<string, any>).forEach(([k, v]) => {
        parsedObj[k] = safeParse(v)
      })

      const keys = Object.keys(parsedObj)
      const preferredKeys = ["records", "data", "items", "rows", "result"]
      let arrayKey = preferredKeys.find((k) => Array.isArray(parsedObj[k]))
      if (!arrayKey) arrayKey = keys.find((k) => Array.isArray(parsedObj[k]))
      if (arrayKey) {
        console.log("[ExtractedDataPanel] Found array key:", arrayKey, "length:", parsedObj[arrayKey]?.length)
        // If there is a `columns` object, use it to define header order
        const colObj = parsedObj["columns"]
        if (colObj && typeof colObj === "object") {
          const names = Object.keys(colObj)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((k) => String(colObj[k]))
            .filter(Boolean)

          const records = parsedObj[arrayKey] as Record<string, any>[]
          if (Array.isArray(records) && records.length > 0) {
            const getRowValues = (row: Record<string, any>, namesArr: string[], count: number): string[] => {
              const vals: string[] = []
              for (let i = 0; i < count; i++) {
                const nameKey = namesArr[i]
                const colKey = `column_${i + 1}`
                const idxAlt = row[i] ?? row[String(i)]
                const value = row?.[nameKey] ?? row?.[colKey] ?? idxAlt
                vals.push(toStr(value))
              }
              return vals
            }

            const count = names.length || Object.keys(records[0] || {}).length
            const rows = records.map((row) => getRowValues(row, names, count))
            const headers = names.length > 0 ? names : Object.keys(records[0] || {})
            return [headers, ...rows]
          }
        }

        const result = arrayToTable(parsedObj[arrayKey])
        console.log("[ExtractedDataPanel] Object array converted to table, rows:", result.length)
        return result
      }
      // Object with primitives -> key/value table
      const entries = Object.entries(parsedObj)
      const keyValueTable = [["Key", "Value"], ...entries.map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : toStr(v)])]
      console.log("[ExtractedDataPanel] Object converted to key/value table, rows:", keyValueTable.length)
      return keyValueTable
    }

    // Fallback: show single row with JSON string
    const fallback = [["Result"], [JSON.stringify(data, null, 2)]]
    console.log("[ExtractedDataPanel] Using fallback format, tableData:", fallback)
    return fallback
  }, [data])

  useEffect(() => {
    if (!extractionId) {
      setHeadersOverride(null)
      return
    }
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: row } = await supabase
          .from("extractions")
          .select("columns")
          .eq("id", extractionId)
          .single()
        const cols = (row?.columns || []) as Array<{ name?: string }>
        const names = cols.map(c => String(c?.name ?? "")).filter(Boolean)
        setHeadersOverride(names.length > 0 ? names : null)
      } catch {
        setHeadersOverride(null)
      }
    })()
  }, [extractionId])

  const finalTableData: string[][] | null = useMemo(() => {
    if (!tableData) {
      console.log("[ExtractedDataPanel] finalTableData: tableData is null")
      return null
    }
    console.log("[ExtractedDataPanel] finalTableData: tableData has", tableData.length, "rows")
    const baseHeaders = Array.isArray(tableData[0]) ? tableData[0] : []
    if (!headersOverride || headersOverride.length === 0) {
      console.log("[ExtractedDataPanel] finalTableData: No headers override, returning tableData as-is")
      return tableData
    }
    let adjusted = headersOverride.slice()
    const targetLen = baseHeaders.length
    if (adjusted.length < targetLen) {
      const lastIsRemarks = String(baseHeaders[targetLen - 1] || "").toLowerCase().includes("remarks")
      while (adjusted.length < targetLen) {
        adjusted.push(lastIsRemarks && adjusted.length === targetLen - 1 ? "remarks" : `column_${adjusted.length + 1}`)
      }
    } else if (adjusted.length > targetLen) {
      adjusted = adjusted.slice(0, targetLen)
    }
    const result = [adjusted, ...tableData.slice(1)]
    console.log("[ExtractedDataPanel] finalTableData: Applied headers override, result has", result.length, "rows")
    return result
  }, [tableData, headersOverride])

  const copyToClipboard = () => {
    const text = data ? JSON.stringify(data, null, 2) : ""
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderHighlighted = (value: string) => {
    const phrases = ["not clear", "notclear", "unclear"]
    const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
    const re = new RegExp(`(${escaped.join("|")})`, "gi")
    const parts = String(value).split(re)
    if (parts.length === 1) return value
    const isMatch = (s: string) => phrases.includes(s.toLowerCase())
    return (
      <span>
        {parts.map((p, i) => (
          isMatch(p) ? (
            <span key={i} className="text-yellow-400 font-semibold">
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          )
        ))}
      </span>
    )
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
        <div className="lg:col-span-2 glass p-6 glow-border min-h-[400px]">
          {/* Loading State - Show this FIRST when loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mb-4" />
              <p className="text-white/70 text-sm mb-2 font-semibold">Extracting data… please wait</p>
              <p className="text-white/50 text-xs mb-1">This may take a few minutes depending on the image complexity</p>
              <p className="text-white/40 text-xs">Waiting for response from extraction service...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded">
              <p className="font-semibold">Extraction failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Data Table or JSON */}
          {!loading && !error && finalTableData && (
            <div className="relative max-h-[60vh] overflow-auto">
              <table className="min-w-max w-full">
                <thead className="sticky top-0 bg-black/40 backdrop-blur">
                  <tr className="border-b border-white/10">
                    {finalTableData[0].map((cell, colIdx) => (
                      <th
                        key={`header-${colIdx}`}
                        className={`px-4 py-3 text-sm font-semibold ${
                          selectedCols.size === 0 || selectedCols.has(colIdx) ? "text-white" : "text-white/30"
                        }`}
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finalTableData.slice(1).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={`border-b border-white/10 transition ${
                        selectedRows.size === 0 || selectedRows.has(rowIdx + 1) ? "bg-yellow-500/10" : "bg-white/5 opacity-50"
                      }`}
                    >
                      {row.map((cell, colIdx) => (
                        <td
                          key={`${rowIdx}-${colIdx}`}
                          className={`px-4 py-3 text-sm transition ${
                            selectedCols.size === 0 || selectedCols.has(colIdx) ? "text-white" : "text-white/30"
                          }`}
                        >
                          {renderHighlighted(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State - Data exists but couldn't be parsed into table */}
          {!loading && !error && !finalTableData && data && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-6 rounded-lg max-w-2xl w-full">
                <p className="font-semibold mb-2">Data received but couldn't be displayed as a table</p>
                <p className="text-sm mb-4 text-yellow-200/80">Showing raw JSON data:</p>
                <pre className="bg-black/30 p-4 rounded text-xs overflow-auto max-h-96 text-white/90 font-mono">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Empty State - No data after extraction */}
          {!loading && !error && !finalTableData && !data && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-white/5 border border-white/10 text-white/60 p-6 rounded-lg">
                <p className="font-semibold mb-2">No data extracted</p>
                <p className="text-sm">The extraction completed but no data was returned. Please try again.</p>
              </div>
            </div>
          )}

        </div>

        {/* Source Image and Stats */}
        <div className="glass p-6 glow-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-white/90 font-semibold mb-3">Source Image</h3>
              {imageUrl ? (
                imageUrl.startsWith("data:application/pdf") ? (
                  <div className="relative w-full h-48 rounded overflow-hidden border border-white/10">
                    <object data={imageUrl} type="application/pdf" className="w-full h-full">
                      <div className="w-full h-full flex items-center justify-center text-white/80">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            <div className="p-2 bg-yellow-500/20 rounded-full">
                              <FileText className="w-5 h-5 text-yellow-400" />
                            </div>
                          </div>
                          <div className="text-sm">PDF preview unsupported in this browser.</div>
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded"
                          >
                            Open PDF
                          </a>
                        </div>
                      </div>
                    </object>
                  </div>
                ) : (
                  <div className="relative w-full h-48 rounded overflow-hidden border border-white/10">
                    <Image src={imageUrl} alt="Source Image" fill className="object-cover" />
                  </div>
                )
              ) : (
                <div className="w-full h-48 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                  No image
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-t border-white/10 pt-4 text-center">
                <p className="text-yellow-400 font-bold text-2xl">{selectedRows.size || (finalTableData?.length ? finalTableData.length - 1 : 0)}</p>
                <p className="text-white/60 text-xs uppercase tracking-wider">Rows Selected</p>
              </div>
              <div className="border-t border-white/10 pt-4 text-center">
                <p className="text-yellow-400 font-bold text-2xl">{selectedCols.size || (finalTableData && finalTableData[0] ? finalTableData[0].length : 0)}</p>
                <p className="text-white/60 text-xs uppercase tracking-wider">Columns Selected</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className={`flex-1 px-4 py-2 ${copied ? "bg-green-600" : "bg-white/10"} border border-white/20 hover:bg-white/15 text-white rounded font-medium text-sm transition flex items-center gap-2 justify-center`}
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => finalTableData && handleExportAndSave(finalTableData)}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/15 text-white rounded font-medium text-sm transition flex items-center gap-2 justify-center"
                disabled={saving}
                title={saveError || (saving ? "Saving…" : "Export and Save to Supabase")}
              >
                <Download className="w-4 h-4" />
                {saving ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
