import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("license")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function LicensePage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="license" searchParams={searchParams} />
}
