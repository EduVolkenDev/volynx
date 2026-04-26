"use client"

import { useEffect } from "react"
import { hydrateDailyLocalStateFromRemote } from "@/lib/daily/storage"

const authStorageKeys = new Set(["volynx_access_token", "volynx_refresh_token"])

export function DailySyncBootstrap() {
  useEffect(() => {
    const runHydration = () => {
      void hydrateDailyLocalStateFromRemote()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runHydration()
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key && authStorageKeys.has(event.key)) {
        runHydration()
      }
    }

    runHydration()
    window.addEventListener("focus", runHydration)
    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("focus", runHydration)
      window.removeEventListener("storage", onStorage)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  return null
}
