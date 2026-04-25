import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("integrations")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function IntegrationsPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="integrations" searchParams={searchParams} />
}
