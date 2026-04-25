import { metrics as defaultMetrics } from "@/content/site"

type MetricsBandProps = {
  items?: { value: string; label: string }[]
}

export function MetricsBand({ items }: MetricsBandProps) {
  const data = items ?? defaultMetrics
  return (
    <section className="py-6">
      <div className="container-shell">
        <div className="surface grid gap-4 p-4 md:grid-cols-4">
          {data.map((metric) => (
            <div key={metric.label} className="rounded-[20px] border border-white/10 bg-black/40 p-5">
              <div className="text-3xl font-semibold tracking-[-0.05em] text-white">{metric.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-zinc-500">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
