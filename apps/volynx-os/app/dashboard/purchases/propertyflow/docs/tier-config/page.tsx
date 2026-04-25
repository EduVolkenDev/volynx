import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("tier-config")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function TierConfigPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="tier-config" searchParams={searchParams} />
}
