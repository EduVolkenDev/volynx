import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "About - VolynxOS",
  description: legalPages.about.description
}

export default function AboutPage() {
  return <LegalPage page={legalPages.about} />
}
