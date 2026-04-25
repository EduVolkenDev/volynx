import { testimonials as defaultTestimonials } from "@/content/site"
import { SectionHeading } from "@/components/common/section-heading"

type TestimonialItem = {
  quote: string
  name: string
  role: string
}

type TestimonialsProps = {
  badge?: string
  title?: string
  copy?: string
  items?: TestimonialItem[]
}

export function Testimonials({
  badge = "Proof",
  title = "Built for teams that sell clarity before decoration.",
  copy = "VolynxOS is shaped around the work that happens after the first pretty screen: reuse, positioning and faster delivery.",
  items = defaultTestimonials
}: TestimonialsProps) {
  return (
    <section className="section-space">
      <div className="container-shell">
        <SectionHeading badge={badge} title={title} copy={copy} align="center" />
        <div className="grid gap-5 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.name} className="surface p-6">
              <blockquote className="text-lg leading-8 text-white">{item.quote}</blockquote>
              <figcaption className="mt-8 border-t border-white/10 pt-5">
                <p className="font-medium text-white">{item.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
