import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "VolynxOS - Premium kit operating system",
  description: "VolynxOS is a premium launch platform for portfolio, agency, SaaS and property product kits.",
  openGraph: {
    title: "VolynxOS",
    description: "Premium launch platform for commercial product kits.",
    url: "https://volynx.world",
    siteName: "VolynxOS",
    type: "website"
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
