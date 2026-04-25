import { ArrowRight } from "lucide-react"

type ProductBannerProps = {
  label: string
  productName: string
  href: string
}

export function ProductBanner({ label, productName, href }: ProductBannerProps) {
  return (
    <div className="border-b border-white/5 bg-white/[0.02]">
      <div className="container-shell flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          <span className="text-zinc-400">{label}</span> - this demo showcases the <strong className="text-white">{productName}</strong> from Volynx
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
        >
          View product <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
