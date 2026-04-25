import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type BrandLockupSize = "sm" | "md" | "lg"

type BrandLockupProps = {
  href?: string
  size?: BrandLockupSize
  caption?: string
  showWordmark?: boolean
  priority?: boolean
  className?: string
}

const SIZE_STYLES: Record<BrandLockupSize, {
  root: string
  frame: string
  wordmark: string
  caption: string
}> = {
  sm: {
    root: "gap-3",
    frame: "h-11 w-11 rounded-[18px] p-1.5",
    wordmark: "text-sm tracking-[0.28em]",
    caption: "text-[9px] tracking-[0.24em]"
  },
  md: {
    root: "gap-4",
    frame: "h-14 w-14 rounded-[22px] p-2",
    wordmark: "text-base tracking-[0.28em]",
    caption: "text-[10px] tracking-[0.26em]"
  },
  lg: {
    root: "gap-5",
    frame: "h-20 w-20 rounded-[28px] p-2.5",
    wordmark: "text-lg md:text-xl tracking-[0.3em]",
    caption: "text-[11px] tracking-[0.28em]"
  }
}

function BrandLockupContent({
  size,
  caption,
  showWordmark,
  priority
}: Omit<BrandLockupProps, "href" | "className"> & { size: BrandLockupSize }) {
  const styles = SIZE_STYLES[size]

  return (
    <>
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(96,165,250,.18),transparent_56%),linear-gradient(145deg,rgba(9,13,25,.96),rgba(19,14,33,.92))] shadow-[0_22px_48px_rgba(0,0,0,.26)]",
          styles.frame
        )}
      >
        <Image
          src="/assets/brand/vx-new.webp"
          alt="VX icon"
          width={256}
          height={256}
          priority={priority}
          className="h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(96,165,250,.24)]"
        />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span className={cn("block font-semibold leading-none text-white", styles.wordmark)}>
            VOLYNX
            <span className="ml-2 text-zinc-400">OS</span>
          </span>
          {caption ? (
            <span className={cn("mt-1.5 block uppercase leading-none text-zinc-500", styles.caption)}>
              {caption}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )
}

export function BrandLockup({
  href,
  size = "md",
  caption,
  showWordmark = true,
  priority = false,
  className
}: BrandLockupProps) {
  const content = (
    <BrandLockupContent
      size={size}
      caption={caption}
      showWordmark={showWordmark}
      priority={priority}
    />
  )

  const classes = cn("inline-flex items-center", SIZE_STYLES[size].root, className)

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="VOLYNX OS">
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
