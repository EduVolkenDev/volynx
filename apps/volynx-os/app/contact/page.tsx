import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Contact - VolynxOS",
  description: legalPages.contact.description
}

export default function ContactPage() {
  return <LegalPage page={legalPages.contact} />
}
