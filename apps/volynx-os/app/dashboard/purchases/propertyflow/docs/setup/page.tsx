import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("setup")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function SetupPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="setup" searchParams={searchParams} />
}
