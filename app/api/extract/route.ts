import { NextResponse } from "next/server"

// Prefer localhost for client calls; 0.0.0.0 is a bind address, not a target
const DEFAULT_WEBHOOK = "http://n8n-j400gwgokog0scs00o8w40gs.72.60.97.246.sslip.io/webhook/099bae8d-7d7d-49d7-8dbb-63d882e44153"

// Allow up to 5 minutes for extraction (300 seconds)
// This is the maximum for Vercel Pro, adjust for your deployment
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || DEFAULT_WEBHOOK
    console.log("[API/extract] Received request, webhook URL:", webhookUrl)
    const reqContentType = req.headers.get("content-type") || ""

    // 1) If the client sent multipart/form-data, forward it as-is
    if (reqContentType.includes("multipart/form-data")) {
      console.log("[API/extract] Processing multipart/form-data request")
      
      try {
        // Get the boundary from content-type header
        const boundary = reqContentType.match(/boundary=([^;]+)/)?.[1]
        console.log("[API/extract] Multipart boundary:", boundary)
        
        // Read the raw request body - handle potential abort errors
        let bodyBuffer: ArrayBuffer
        try {
          bodyBuffer = await req.arrayBuffer()
          console.log("[API/extract] Request body size:", bodyBuffer.byteLength, "bytes")
        } catch (readError: any) {
          console.error("[API/extract] Error reading request body:", readError)
          if (readError.name === 'AbortError' || readError.message?.includes('aborted')) {
            return NextResponse.json(
              { error: "Request was cancelled. Please try again." },
              { status: 499 } // Client Closed Request
            )
          }
          throw readError
        }
        
        // NO TIMEOUT - Just wait for the response from n8n
        // We wait as long as it takes for n8n to process and respond
        console.log("[API/extract] Sending request to n8n webhook, waiting for response (no timeout)...")
        console.log("[API/extract] Webhook URL:", webhookUrl)
        
        // Fetch without any timeout or abort signal - just wait for the response
        let res: Response
        try {
          res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": reqContentType, // Forward the exact content-type with boundary
            },
            body: bodyBuffer, // Forward the raw body
            // NO signal - we don't abort, we just wait
          })
        } catch (fetchError: any) {
          console.error("[API/extract] Fetch failed:", fetchError)
          console.error("[API/extract] Fetch error name:", fetchError?.name)
          console.error("[API/extract] Fetch error message:", fetchError?.message)
          console.error("[API/extract] Fetch error cause:", fetchError?.cause)
          throw new Error(`Failed to connect to webhook at ${webhookUrl}: ${fetchError?.message || fetchError?.toString()}`)
        }

        console.log("[API/extract] Received response from n8n, status:", res.status, "ok:", res.ok)

        // Always try to get the response body, regardless of status
        // Read the response body completely before processing
        const contentType = res.headers.get("content-type") || "application/json"
        console.log("[API/extract] Response content-type:", contentType)
        
        try {
          if (contentType.includes("application/json")) {
            try {
              const data = await res.json()
              console.log("[API/extract] Successfully parsed JSON response")
              console.log("[API/extract] Response data keys:", Object.keys(data || {}))
              console.log("[API/extract] Response data sample:", JSON.stringify(data).substring(0, 500))
              
              // Forward the response with 200 status if we have data, regardless of n8n status
              // This ensures the client receives the data even if n8n returns non-200
              return NextResponse.json(data, { status: 200 })
            } catch (parseError: any) {
              console.error("[API/extract] Failed to parse JSON response:", parseError)
              // Try to get text instead
              const text = await res.text()
              console.log("[API/extract] Response text (first 500 chars):", text.substring(0, 500))
              
              // Try to parse as JSON one more time from text
              try {
                const data = JSON.parse(text)
                console.log("[API/extract] Successfully parsed JSON from text")
                return NextResponse.json(data, { status: 200 })
              } catch {
                return NextResponse.json(
                  { error: "Failed to parse JSON response", raw: text.substring(0, 1000) },
                  { status: res.status }
                )
              }
            }
          } else {
            const text = await res.text()
            console.log("[API/extract] Non-JSON response received, length:", text.length)
            
            // Try to parse as JSON anyway
            try {
              const data = JSON.parse(text)
              console.log("[API/extract] Parsed non-JSON content-type as JSON successfully")
              return NextResponse.json(data, { status: 200 })
            } catch {
              return new Response(text, {
                status: res.status,
                headers: { "Content-Type": contentType },
              })
            }
          }
        } catch (responseError: any) {
          console.error("[API/extract] Error reading response body:", responseError)
          return NextResponse.json(
            { error: `Failed to read response: ${responseError.message}` },
            { status: 500 }
          )
        }
      } catch (formDataError: any) {
        console.error("[API/extract] Error processing FormData:", formDataError)
        console.error("[API/extract] FormData error details:", {
          name: formDataError.name,
          message: formDataError.message,
          stack: formDataError.stack,
          cause: formDataError.cause
        })
        
        // Handle abort errors specifically
        if (formDataError.name === 'AbortError' || formDataError.message?.includes('aborted')) {
          return NextResponse.json(
            { error: "Request was cancelled or timed out. Please try again." },
            { status: 499 }
          )
        }
        
        // Handle network/fetch errors with more detail
        if (formDataError.message?.includes('Failed to connect') || formDataError.message?.includes('fetch failed')) {
          return NextResponse.json(
            { 
              error: `Cannot reach webhook server. Please verify the webhook URL is accessible: ${webhookUrl}`,
              details: formDataError.message
            },
            { status: 502 } // Bad Gateway
          )
        }
        
        return NextResponse.json(
          { error: `Failed to process form data: ${formDataError.message}` },
          { status: 400 }
        )
      }
    }

    // 2) Otherwise parse JSON and support both JSON forward and base64->multipart
    const payload = await req.json()

    // If payload contains base64 file fields, convert to multipart
    const base64 = payload?.fileBase64 || payload?.file?.base64
    const fileMime = payload?.fileMime || payload?.file?.mime || "application/octet-stream"
    const fileName = payload?.fileName || payload?.file?.name || "upload.bin"
    const body = payload?.body ?? payload

    if (base64) {
      // Strip data URL prefix if present
      const base64Raw = typeof base64 === "string" ? base64.replace(/^data:[^;]+;base64,/, "") : ""
      const bytes = Buffer.from(base64Raw, "base64")
      const blob = new Blob([bytes], { type: fileMime })

      const form = new FormData()
      form.append("file", blob, fileName)
      form.append("body", JSON.stringify(body))

      // Set a longer timeout for n8n processing (5 minutes)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes

      const res = await fetch(webhookUrl, {
        method: "POST",
        body: form,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId)
      })

      const contentType = res.headers.get("content-type") || "application/json"
      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => null)
        return NextResponse.json(data ?? { message: "No JSON returned" }, { status: res.status })
      } else {
        const text = await res.text()
        return new Response(text, {
          status: res.status,
          headers: { "Content-Type": contentType },
        })
      }
    }

    // No file: just forward JSON
    // Set a longer timeout for n8n processing (5 minutes)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId)
    })

    const contentType = res.headers.get("content-type") || "application/json"
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null)
      return NextResponse.json(data ?? { message: "No JSON returned" }, { status: res.status })
    } else {
      const text = await res.text()
      return new Response(text, {
        status: res.status,
        headers: { "Content-Type": contentType },
      })
    }
  } catch (err: any) {
    console.error("[API/extract] Error occurred:", err)
    console.error("[API/extract] Error name:", err.name)
    console.error("[API/extract] Error message:", err.message)
    console.error("[API/extract] Error stack:", err.stack)
    
    // Handle timeout errors gracefully
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.error("[API/extract] Request timed out after 5 minutes")
      return NextResponse.json(
        { error: "Request timeout - extraction is taking longer than expected. The process may still be running." },
        { status: 504 } // Gateway Timeout
      )
    }
    
    // Handle network/connection errors
    const errorMsg = err?.message || "Proxy request failed"
    console.error("[API/extract] Returning error response:", errorMsg)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
