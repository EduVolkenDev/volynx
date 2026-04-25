import { Badge } from "@/components/common/badge"

type SectionHeadingProps = {
  badge?: string
  title: string
  copy?: string
  align?: "left" | "center"
}

export function SectionHeading({ badge, title, copy, align = "left" }: SectionHeadingProps) {
  const centered = align === "center"
  return (
    <div className={centered ? "mx-auto mb-14 max-w-3xl text-center" : "mb-14 max-w-3xl"}>
      {badge ? <Badge>{badge}</Badge> : null}
      <h2 className="section-title">{title}</h2>
      {copy ? <p className="section-copy mt-5">{copy}</p> : null}
    </div>
  )
}
