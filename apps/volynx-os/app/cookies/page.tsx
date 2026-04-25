import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Cookie Policy - VolynxOS",
  description: legalPages.cookies.description
}

export default function CookiesPage() {
  return <LegalPage page={legalPages.cookies} />
}
