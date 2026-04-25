"use client"

import { useEffect } from "react"

type DocumentLanguageProps = {
  lang: string
}

export function DocumentLanguage({ lang }: DocumentLanguageProps) {
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return null
}
