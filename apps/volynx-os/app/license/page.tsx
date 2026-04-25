import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "License - VolynxOS",
  description: legalPages.license.description
}

export default function LicensePage() {
  return <LegalPage page={legalPages.license} />
}
