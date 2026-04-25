import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("migration-toolkit")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function MigrationToolkitPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="migration-toolkit" searchParams={searchParams} />
}
