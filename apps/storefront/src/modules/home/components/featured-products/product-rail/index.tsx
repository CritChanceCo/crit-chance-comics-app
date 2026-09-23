"use client"

import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import { searchClient } from "@lib/config"
import { InstantSearch, Hits, SearchBox, Pagination } from "react-instantsearch"

export default function MeilisearchProductRail({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  return (
    <div className="py-12 content-container small:py-24">
      <InstantSearch indexName="comics" searchClient={searchClient}>
        <div className="mb-8 flex justify-end">
          <SearchBox />
        </div>

        <Hits
          hitComponent={({ hit }: { hit: HttpTypes.StoreProduct }) => (
            <div key={hit.id}>
              <ProductPreview
                product={hit}
                region={region}
                isFeatured={false}
              />
            </div>
          )}
        />
        <Pagination showLast={true} />
      </InstantSearch>
    </div>
  )
}
