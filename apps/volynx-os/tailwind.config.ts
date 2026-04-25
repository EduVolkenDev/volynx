import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx,md}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#060606",
        foreground: "#f3f3f3",
        panel: "#0d0d0d",
        line: "#1d1d1d",
        muted: "#9d9d9d",
        accent: "#ffffff",
        success: "#9BFFB0"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,.06), 0 20px 80px rgba(0,0,0,.45)"
      },
      backgroundImage: {
        "grid-fade": "radial-gradient(circle at center, rgba(255,255,255,.08) 1px, transparent 1px)",
        "hero-glow": "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)"
      },
      fontSize: {
        "hero-sm": ["2.75rem", { lineHeight: "1.02", letterSpacing: "-0.05em" }],
        "hero-md": ["4.5rem", { lineHeight: "0.98", letterSpacing: "-0.05em" }],
        "hero-lg": ["6.5rem", { lineHeight: "0.94", letterSpacing: "-0.06em" }]
      },
      maxWidth: {
        "8xl": "90rem"
      }
    }
  },
  plugins: []
}

export default config
