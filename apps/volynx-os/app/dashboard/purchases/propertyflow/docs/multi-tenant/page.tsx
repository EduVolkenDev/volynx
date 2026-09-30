import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("multi-tenant")

type DocPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default function MultiTenantPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="multi-tenant" searchParams={searchParams} />
}
