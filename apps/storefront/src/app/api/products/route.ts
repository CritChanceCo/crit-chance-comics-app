import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const countryCode = searchParams.get("countryCode") || "us"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const offset = (page - 1) * limit

    const { products, count } = await sdk.store.product.list({
      limit,
      offset,
      fields: "+variants.calculated_price,+variants.inventory_quantity",
      order: "created_at",
    })

    return NextResponse.json({
      products,
      count,
      hasMore: offset + products.length < count,
    })
  } catch (error: any) {
    console.error("API Products Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
