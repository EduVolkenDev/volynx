import type { Metadata } from "next"
import { LegalPage } from "@/components/common/legal-page"
import { legalPages } from "@/content/legal-pages"

export const metadata: Metadata = {
  title: "Refund Policy - VolynxOS",
  description: legalPages.refund.description
}

export default function RefundPage() {
  return <LegalPage page={legalPages.refund} />
}
