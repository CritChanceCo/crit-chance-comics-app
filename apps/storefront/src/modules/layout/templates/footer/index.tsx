import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaCTA from "@modules/layout/components/medusa-cta"

import Image from "next/image"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="bg-ui-bg-subtle relative w-full overflow-hidden">
      <Image
        src="/images/footer.png"
        alt=""
        width={4096}
        height={3025}
        className="h-auto w-full"
        priority
      />
      <div className="absolute inset-0 z-10">
        <div className="flex w-full flex-col content-container">
          <div className="flex flex-row items-start justify-between gap-y-6 py-20 pb-5">
            <div>
              <LocalizedClientLink
                href="/"
                className="txt-compact-xlarge-plus text-ui-bg-subtle hover:text-ui-bg-base uppercase"
              >
                Medusa Store
              </LocalizedClientLink>
            </div>
            <div className="text-small-regular grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-x-16">
              {productCategories && productCategories?.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-bg-base">
                    Categories
                  </span>
                  <ul
                    className="grid grid-cols-1 gap-2"
                    data-testid="footer-categories"
                  >
                    {productCategories?.slice(0, 6).map((c) => {
                      if (c.parent_category) {
                        return
                      }

                      const children =
                        c.category_children?.map((child) => ({
                          name: child.name,
                          handle: child.handle,
                          id: child.id,
                        })) || null

                      return (
                        <li
                          className="text-ui-bg-subtle txt-small flex flex-col gap-2"
                          key={c.id}
                        >
                          <LocalizedClientLink
                            className={clx(
                              "hover:text-ui-bg-base",
                              children && "txt-small-plus"
                            )}
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </LocalizedClientLink>
                          {children && (
                            <ul className="ml-3 grid grid-cols-1 gap-2">
                              {children &&
                                children.map((child) => (
                                  <li key={child.id}>
                                    <LocalizedClientLink
                                      className="hover:text-ui-bg-base"
                                      href={`/categories/${child.handle}`}
                                      data-testid="category-link"
                                    >
                                      {child.name}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {collections && collections.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-bg-base">
                    Collections
                  </span>
                  <ul
                    className={clx(
                      "grid grid-cols-1 gap-2 text-ui-bg-subtle txt-small",
                      {
                        "grid-cols-2": (collections?.length || 0) > 3,
                      }
                    )}
                  >
                    {collections?.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <LocalizedClientLink
                          className="hover:text-ui-bg-base"
                          href={`/collections/${c.handle}`}
                        >
                          {c.title}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-bg-base">Medusa</span>
                <ul className="text-ui-bg-subtle txt-small grid grid-cols-1 gap-y-2">
                  <li>
                    <a
                      href="https://github.com/medusajs"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-bg-base"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.medusajs.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-bg-base"
                    >
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/medusajs/dtc-starter"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-bg-base"
                    >
                      Source code
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="text-ui-bg-muted flex w-full justify-between">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} Medusa Store. All rights reserved.
            </Text>
            <MedusaCTA />
          </div>
        </div>
      </div>
    </footer>
  )
}
