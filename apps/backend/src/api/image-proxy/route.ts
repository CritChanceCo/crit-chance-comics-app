import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const querySchema = z.object({
  url: z.url("Invalid URL"),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { url } = querySchema.parse(req.query)

    // Allowed domains for CLZ and common comic sites
    const allowedDomains = [
      "clz.com",
      "clzcomics.com",
      "sizr.io",
      "covrprice.com",
      "coverprice.com",
      "images.com",
      "cdn",
    ]

    const isAllowed = allowedDomains.some(domain => url.toLowerCase().includes(domain))

    if (!isAllowed) {
      return res.status(403).json({
        message: "Domain not allowed for security reasons",
        url
      })
    }

    console.log(`[Image Proxy] Fetching: ${url}`)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Medusa-CLZ-Image-Proxy/1.0",
        "Accept": "image/*,*/*",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      return res.status(response.status).json({
        message: `Image fetch failed: ${response.status} ${response.statusText}`
      })
    }

    const contentType = response.headers.get("content-type") || "image/jpeg"

    // Only allow image content types
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ message: "URL did not return an image" })
    }

    const buffer = await response.arrayBuffer()

    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "public, max-age=31536000") // 1 year cache
    res.setHeader("Access-Control-Allow-Origin", "*") // Safe since this is a proxy

    return res.send(Buffer.from(buffer))
  } catch (error: any) {
    console.error("[Image Proxy Error]:", error)

    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid URL parameter" })
    }

    return res.status(500).json({
      message: "Failed to proxy image",
      error: error.message
    })
  }
}
