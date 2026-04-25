"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ThemeName = "onyx" | "ivory" | "signal"

const themes: { name: ThemeName; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "onyx", label: "Onyx", icon: Moon },
  { name: "ivory", label: "Ivory", icon: Sun },
  { name: "signal", label: "Signal", icon: Monitor }
]

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>("onyx")

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("volynx-theme") as ThemeName | null
    const initialTheme = storedTheme && themes.some((item) => item.name === storedTheme) ? storedTheme : "onyx"
    setTheme(initialTheme)
    document.documentElement.dataset.theme = initialTheme
  }, [])

  function selectTheme(nextTheme: ThemeName) {
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem("volynx-theme", nextTheme)
  }

  return (
    <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1" aria-label="Theme selector">
      {themes.map((item) => {
        const Icon = item.icon
        const active = theme === item.name

        return (
          <button
            key={item.name}
            type="button"
            onClick={() => selectTheme(item.name)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:text-white",
              active && "bg-white text-black hover:text-black"
            )}
            aria-label={`Use ${item.label} theme`}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
