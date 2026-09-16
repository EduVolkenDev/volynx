import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("onboarding")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function OnboardingPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="onboarding" searchParams={searchParams} />
}
