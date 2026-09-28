import { ConsoleWorkspace } from '@/components/console/ConsoleWorkspace'

type Params = { client: string; product: string; env: string }

export default function ConsoleOverviewPage({ params }: { params: Params }) {
  return <ConsoleWorkspace route={{ mode: 'overview', ctx: params }} />
}
