import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Terms of Service - VolynxOS",
  description: legalPages.terms.description
}

export default function TermsPage() {
  return <LegalPage page={legalPages.terms} />
}
