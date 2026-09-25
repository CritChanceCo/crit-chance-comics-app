"use client"

import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { searchClient } from "@lib/config"
import { InstantSearch, Hits, SearchBox, Pagination } from "react-instantsearch"

export default function MeilisearchProductRail({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  return (
    <div className="flex w-full flex-col">
      <InstantSearch
        searchClient={searchClient}
        indexName={process.env.NEXT_PUBLIC_MEILISEARCH_INDEX_NAME}
      >
        <div className="flex flex-row items-baseline justify-between gap-10 py-10 content-container">
          <LocalizedClientLink
            href="/"
            className="xl:w-[250%] small:block"
            data-testid="nav-store-link"
          >
            <Image
              src="/images/crit-chance-comics.svg"
              alt="Crit Chance Comics Logo"
              width={3650}
              height={1945}
              className="object-contain"
              priority
            />
          </LocalizedClientLink>{" "}
          <SearchBox
            placeholder="SEARCH"
            className="custom-search-box w-full"
          />
        </div>
        <div className="content-container">
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
        </div>
        <Pagination showLast={true} />
      </InstantSearch>
    </div>
  )
}
