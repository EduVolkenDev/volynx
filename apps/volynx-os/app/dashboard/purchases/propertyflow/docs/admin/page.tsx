import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("admin")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function AdminPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="admin" searchParams={searchParams} />
}
