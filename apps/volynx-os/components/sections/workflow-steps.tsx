import Image from "next/image"
import { workflow as defaultWorkflow } from "@/content/site"
import { volynxCardIcons } from "@/content/volynx-card-icons"
import { SectionHeading } from "@/components/common/section-heading"

type WorkflowItem = {
  step: string
  title: string
  copy: string
}

type WorkflowStepsProps = {
  badge?: string
  title?: string
  copy?: string
  items?: WorkflowItem[]
}

export function WorkflowSteps({
  badge = "Workflow",
  title = "A repeatable launch process, not a gallery of disconnected pages.",
  copy = "Use VolynxOS the same way serious studios operate: pick the product line, attach the right blocks, then ship with documentation and speed.",
  items = defaultWorkflow
}: WorkflowStepsProps) {
  return (
    <section className="section-space">
      <div className="container-shell">
        <SectionHeading badge={badge} title={title} copy={copy} align="center" />
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item, index) => {
            const icon = volynxCardIcons.workflow[index % volynxCardIcons.workflow.length]

            return (
              <article key={item.step} className="surface p-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                  <Image src={icon} alt="" width={140} height={140} className="h-20 w-20 object-contain" />
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.25em] text-zinc-500">{item.step}</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{item.copy}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
