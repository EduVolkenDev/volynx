import type { Metadata } from "next"
import { SiteFooter } from "@/components/common/site-footer"
import { SiteHeader } from "@/components/common/site-header"
import { IconsStoreSection } from "@/components/sections/icons-store-section"

export const metadata: Metadata = {
  title: "VolynxOS Icons Store",
  description: "Premium neon SVG icons for VolynxOS product launches, SaaS stores and digital kits."
}

export default function IconsStorePage() {
  return (
    <>
      <SiteHeader />
      <IconsStoreSection />
      <SiteFooter />
    </>
  )
}
