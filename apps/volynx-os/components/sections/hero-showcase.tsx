const variants = [
  {
    name: "Centered",
    use: "Product-first launches with one confident message.",
    layout: "items-center text-center"
  },
  {
    name: "Split",
    use: "Launches that need metrics, context and a product cue.",
    layout: "items-end"
  },
  {
    name: "Minimal",
    use: "Technical, editorial or manifesto-led pages.",
    layout: "items-start"
  },
  {
    name: "Product",
    use: "Demo-led pages with a compact preview module.",
    layout: "items-center text-center"
  }
]

export function HeroShowcase() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {variants.map((variant) => (
        <article key={variant.name} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className={`flex h-36 rounded-lg border border-white/10 bg-black/30 p-4 ${variant.layout}`}>
            <div className="w-full">
              <div className="h-2 w-20 rounded-full bg-white/20" />
              <div className="mt-4 h-5 w-4/5 rounded-full bg-white/60" />
              <div className="mt-2 h-5 w-3/5 rounded-full bg-white/35" />
              <div className="mt-5 flex gap-2">
                <div className="h-7 w-20 rounded-md bg-white" />
                <div className="h-7 w-20 rounded-md border border-white/20" />
              </div>
            </div>
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">{variant.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{variant.use}</p>
        </article>
      ))}
    </div>
  )
}
