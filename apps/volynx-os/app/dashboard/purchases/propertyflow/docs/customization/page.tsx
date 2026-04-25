import { metadataForPropertyFlowDoc, PropertyFlowDocView } from "../doc-page"

export const metadata = metadataForPropertyFlowDoc("customization")

type DocPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function CustomizationPage({ searchParams }: DocPageProps) {
  return <PropertyFlowDocView slug="customization" searchParams={searchParams} />
}
