import { ConsoleWorkspace } from '@/components/console/ConsoleWorkspace'

type Params = { client: string; product: string; env: string; section: string }

export default function ConsoleSectionPage({ params }: { params: Params }) {
  return <ConsoleWorkspace route={{ mode: 'section', ctx: params, section: params.section }} />
}
