import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("white-label")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function WhiteLabelPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="white-label" searchParams={searchParams} />
}
