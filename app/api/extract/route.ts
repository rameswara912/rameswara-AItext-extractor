import { NextResponse } from "next/server"

// Prefer localhost for client calls; 0.0.0.0 is a bind address, not a target
const DEFAULT_WEBHOOK = "http://localhost:5678/webhook/099bae8d-7d7d-49d7-8dbb-63d882e44153"

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || DEFAULT_WEBHOOK
    const reqContentType = req.headers.get("content-type") || ""

    // 1) If the client sent multipart/form-data, forward it as-is
    if (reqContentType.includes("multipart/form-data")) {
      const incomingForm = await req.formData()
      const forwardForm = new FormData()
      for (const [key, value] of incomingForm.entries()) {
        forwardForm.append(key, value as any)
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        body: forwardForm,
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

      const res = await fetch(webhookUrl, {
        method: "POST",
        body: form,
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
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    return NextResponse.json(
      { error: err?.message || "Proxy request failed" },
      { status: 500 }
    )
  }
}
