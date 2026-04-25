type MarkdownDocumentProps = {
  source: string
}

function headingClass(level: number) {
  if (level === 1) {
    return "text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl"
  }

  if (level === 2) {
    return "pt-6 text-3xl font-semibold tracking-[-0.04em] text-white"
  }

  return "pt-4 text-xl font-semibold tracking-[-0.03em] text-white"
}

export function MarkdownDocument({ source }: MarkdownDocumentProps) {
  const lines = source.replace(/\r\n/g, "\n").split("\n")
  const blocks: React.ReactNode[] = []
  let paragraph: string[] = []
  let index = 0

  const flushParagraph = () => {
    if (!paragraph.length) {
      return
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="text-base leading-8 text-zinc-400">
        {paragraph.join(" ")}
      </p>
    )
    paragraph = []
  }

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      index += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      flushParagraph()
      index += 1
      const code: string[] = []

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index])
        index += 1
      }

      blocks.push(
        <pre key={`code-${blocks.length}`} className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-4 text-sm leading-6 text-zinc-300">
          <code>{code.join("\n")}</code>
        </pre>
      )
      index += 1
      continue
    }

    if (trimmed.startsWith("|")) {
      flushParagraph()
      const table: string[] = []

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        table.push(lines[index])
        index += 1
      }

      blocks.push(
        <pre key={`table-${blocks.length}`} className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-zinc-300">
          {table.join("\n")}
        </pre>
      )
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed)

    if (heading) {
      flushParagraph()
      const level = heading[1].length
      const Tag = `h${Math.min(level, 3)}` as "h1" | "h2" | "h3"

      blocks.push(
        <Tag key={`h-${blocks.length}`} className={headingClass(level)}>
          {heading[2]}
        </Tag>
      )
      index += 1
      continue
    }

    if (trimmed === "---") {
      flushParagraph()
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-white/10" />)
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushParagraph()
      const ordered = /^\d+\.\s+/.test(trimmed)
      const items: string[] = []
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/

      while (index < lines.length && pattern.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(pattern, ""))
        index += 1
      }

      const List = ordered ? "ol" : "ul"
      blocks.push(
        <List
          key={`list-${blocks.length}`}
          className={ordered ? "list-decimal space-y-2 pl-6 text-zinc-400" : "list-disc space-y-2 pl-6 text-zinc-400"}
        >
          {items.map((item) => (
            <li key={item} className="leading-7">{item}</li>
          ))}
        </List>
      )
      continue
    }

    paragraph.push(trimmed)
    index += 1
  }

  flushParagraph()

  return <div className="space-y-6">{blocks}</div>
}
