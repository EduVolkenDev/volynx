import type { Metadata } from "next"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { IconsDeliveryClient } from "./delivery-client"

export const metadata: Metadata = {
  title: "Icons Store delivery - VolynxOS",
  description: "Post-purchase delivery area for VolynxOS icon packs."
}

export default function IconsDeliveryPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <IconsDeliveryClient />
      </main>
      <SiteFooter />
    </>
  )
}
