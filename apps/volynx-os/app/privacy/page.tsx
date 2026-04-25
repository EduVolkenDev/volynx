import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Privacy Policy - VolynxOS",
  description: legalPages.privacy.description
}

export default function PrivacyPage() {
  return <LegalPage page={legalPages.privacy} />
}
