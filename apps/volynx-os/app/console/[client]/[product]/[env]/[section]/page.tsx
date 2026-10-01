import { ConsoleWorkspace } from '@/components/console/ConsoleWorkspace'

type Params = { client: string; product: string; env: string; section: string }

export default async function ConsoleSectionPage({ params }: { params: Promise<Params> }) {
  const context = await params
  return <ConsoleWorkspace route={{ mode: 'section', ctx: context, section: context.section }} />
}
