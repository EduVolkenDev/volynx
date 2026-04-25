const defaultLogos = ["DEV FOUNDRY", "PIXEL OPS", "STUDIO NORTH", "AGENCY ZERO", "STARTUP LAB"]

type LogoCloudProps = {
  logos?: string[]
}

export function LogoCloud({ logos }: LogoCloudProps) {
  const items = logos ?? defaultLogos
  return (
    <section className="border-y border-white/5 py-6">
      <div className="container-shell flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {items.map((logo) => (
          <span key={logo} className="text-xs font-medium tracking-[0.28em] text-zinc-500">
            {logo}
          </span>
        ))}
      </div>
    </section>
  )
}
