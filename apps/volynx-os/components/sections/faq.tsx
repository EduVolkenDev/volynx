import { faqs as defaultFaqs } from "@/content/site"
import { SectionHeading } from "@/components/common/section-heading"

type FAQProps = {
  badge?: string
  title?: string
  copy?: string
  items?: { question: string; answer: string }[]
}

export function FAQ({
  badge = "FAQ",
  title = "The practical questions buyers ask before they convert.",
  copy = "Answering these clearly reduces friction, support load and trust gaps.",
  items
}: FAQProps) {
  const data = items ?? defaultFaqs
  return (
    <section className="section-space">
      <div className="container-shell">
        <SectionHeading badge={badge} title={title} copy={copy} />
        <div className="grid gap-4">
          {data.map((item) => (
            <article key={item.question} className="surface p-6">
              <h3 className="text-xl font-medium tracking-[-0.03em] text-white">{item.question}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
