import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("supabase")

type DocPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default function SupabasePage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="supabase" searchParams={searchParams} />
}
