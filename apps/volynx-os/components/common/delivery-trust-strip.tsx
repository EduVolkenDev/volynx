import { CheckCircle2, LockKeyhole, MailCheck, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type DeliveryTrustStripProps = {
  className?: string
  productName: string
}

type TrustItem = {
  label: string
  copy: string
  icon: LucideIcon
}

const trustItems: TrustItem[] = [
  {
    label: "Session checked",
    copy: "Stripe return data is verified before the delivery surface unlocks.",
    icon: CheckCircle2
  },
  {
    label: "Private ZIP",
    copy: "The archive URL is issued only after the protected download request passes.",
    icon: LockKeyhole
  },
  {
    label: "Support ready",
    copy: "Your checkout context gives support a fast recovery path if delivery stalls.",
    icon: MailCheck
  }
]

export function DeliveryTrustStrip({ className, productName }: DeliveryTrustStripProps) {
  return (
    <section aria-label={`${productName} delivery checks`} className={cn("grid gap-3 md:grid-cols-3", className)}>
      {trustItems.map((item) => {
        const Icon = item.icon

        return (
          <article key={item.label} className="surface flex min-h-[136px] gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-emerald-200">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{item.copy}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}
