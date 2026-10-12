import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"

import Image from "next/image"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="group sticky inset-x-0 top-0 z-50">
      <header className="bg-ui-bg-subtle relative mx-auto h-16 duration-200">
        <nav className="txt-xsmall-plus text-ui-fg-subtle text-small-regular flex h-full w-full items-center justify-between content-container">
          <div className="flex h-full flex-1 basis-0 items-center">
            <LocalizedClientLink
              href="/"
              className="h-full w-20 items-center"
              data-testid="nav-store-link"
            >
              <Image
                src="/images/crit-chance-comics.svg"
                alt="Crit Chance Comics Logo"
                width={3650}
                height={1945}
                className="h-full object-contain"
                priority
              />
            </LocalizedClientLink>
          </div>

          <div className="flex h-full items-center"></div>

          <div className="flex h-full flex-1 basis-0 items-center justify-end gap-x-6">
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
            <div className="items-center gap-x-6 small:flex">
              <LocalizedClientLink
                href="/account"
                data-testid="nav-account-link"
              >
                <Image
                  src="/images/account.png"
                  alt=""
                  width={256}
                  height={256}
                  className="h-auto w-20"
                  priority
                />
              </LocalizedClientLink>
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
