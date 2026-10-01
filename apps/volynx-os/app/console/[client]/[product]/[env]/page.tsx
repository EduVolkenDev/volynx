import { ConsoleWorkspace } from '@/components/console/ConsoleWorkspace'

type Params = { client: string; product: string; env: string }

export default async function ConsoleOverviewPage({ params }: { params: Promise<Params> }) {
  return <ConsoleWorkspace route={{ mode: 'overview', ctx: await params }} />
}
