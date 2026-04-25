import type { Metadata } from "next"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { PropertyFlowDeliveryClient } from "./delivery-client"

export const metadata: Metadata = {
  title: "PropertyFlow delivery - VolynxOS",
  description: "Post-purchase delivery area for PropertyFlow tiers, docs and downloads."
}

export default function PropertyFlowDeliveryPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PropertyFlowDeliveryClient />
      </main>
      <SiteFooter />
    </>
  )
}
