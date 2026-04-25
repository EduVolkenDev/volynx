export type StoreIcon = {
  label: string
  category: string
  tone: string
  badge?: string
  badgeTone?: string
  svg: string
}

export const iconStoreCategories = ["All", "Productivity", "System", "Finance", "Social", "Media"] as const

export const iconStoreIcons: StoreIcon[] = [
  {
    "label": "AI Brain",
    "category": "System",
    "tone": "cyan",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <defs>\n          <radialGradient id=\"bg1\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a237e\"/><stop offset=\"100%\" stop-color=\"#0a0e24\"/></radialGradient>\n          <radialGradient id=\"glow1\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"#4fc3f7\" stop-opacity=\"0.6\"/><stop offset=\"100%\" stop-color=\"#4fc3f7\" stop-opacity=\"0\"/></radialGradient>\n        </defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg1)\"/>\n        <ellipse cx=\"27\" cy=\"28\" rx=\"13\" ry=\"11\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" fill=\"none\" opacity=\"0.9\"/>\n        <path d=\"M20 24 Q27 20 34 24\" stroke=\"#7c4dff\" stroke-width=\"1.2\" fill=\"none\" opacity=\"0.8\"/>\n        <path d=\"M19 28 Q27 32 35 28\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" fill=\"none\" opacity=\"0.6\"/>\n        <circle cx=\"27\" cy=\"28\" r=\"3.5\" fill=\"#4fc3f7\" opacity=\"0.9\"/>\n        <line x1=\"27\" y1=\"17\" x2=\"27\" y2=\"14\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <circle cx=\"27\" cy=\"13\" r=\"2\" fill=\"#7c4dff\"/>\n        <line x1=\"14\" y1=\"28\" x2=\"11\" y2=\"28\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <circle cx=\"10\" cy=\"28\" r=\"2\" fill=\"#4fc3f7\" opacity=\"0.7\"/>\n        <line x1=\"40\" y1=\"28\" x2=\"43\" y2=\"28\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <circle cx=\"44\" cy=\"28\" r=\"2\" fill=\"#4fc3f7\" opacity=\"0.7\"/>\n        <circle cx=\"20\" cy=\"24\" r=\"1.5\" fill=\"#7c4dff\"/>\n        <circle cx=\"34\" cy=\"24\" r=\"1.5\" fill=\"#7c4dff\"/>\n        <circle cx=\"20\" cy=\"32\" r=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.6\"/>\n        <circle cx=\"34\" cy=\"32\" r=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.6\"/>\n      </svg>"
  },
  {
    "label": "Wallet",
    "category": "Finance",
    "tone": "amber",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg2\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#2d1b00\"/><stop offset=\"100%\" stop-color=\"#0d0900\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg2)\"/>\n        <rect x=\"10\" y=\"18\" width=\"34\" height=\"22\" rx=\"4\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.5\"/>\n        <rect x=\"10\" y=\"22\" width=\"34\" height=\"6\" fill=\"#ffb74d\" opacity=\"0.15\"/>\n        <rect x=\"35\" y=\"24\" width=\"10\" height=\"10\" rx=\"3\" fill=\"#ffb74d\" opacity=\"0.2\" stroke=\"#ffb74d\" stroke-width=\"1\"/>\n        <circle cx=\"40\" cy=\"29\" r=\"2.5\" fill=\"#ffb74d\" opacity=\"0.9\"/>\n        <line x1=\"10\" y1=\"22\" x2=\"44\" y2=\"22\" stroke=\"#ffb74d\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <rect x=\"14\" y=\"27\" width=\"10\" height=\"1.5\" rx=\"1\" fill=\"#ffb74d\" opacity=\"0.5\"/>\n        <rect x=\"14\" y=\"31\" width=\"7\" height=\"1.5\" rx=\"1\" fill=\"#ffb74d\" opacity=\"0.3\"/>\n        <path d=\"M18 14 L36 14\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M22 11 L32 11\" stroke=\"#ffb74d\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.25\"/>\n      </svg>"
  },
  {
    "label": "Shield Lock",
    "category": "System",
    "tone": "purple",
    "badge": "PRO",
    "badgeTone": "pro",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg3\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a0a2e\"/><stop offset=\"100%\" stop-color=\"#080512\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg3)\"/>\n        <path d=\"M27 11 L39 16 L39 28 C39 35 33 40 27 43 C21 40 15 35 15 28 L15 16 Z\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.5\"/>\n        <path d=\"M27 13.5 L37 17.8 L37 28 C37 33.5 32.5 37.8 27 40.5 C21.5 37.8 17 33.5 17 28 L17 17.8 Z\" fill=\"#7c4dff\" opacity=\"0.12\"/>\n        <rect x=\"22\" y=\"26\" width=\"10\" height=\"9\" rx=\"2\" fill=\"none\" stroke=\"#ce93d8\" stroke-width=\"1.2\"/>\n        <path d=\"M24 26 L24 23 C24 21.3 25.3 20 27 20 C28.7 20 30 21.3 30 23 L30 26\" stroke=\"#ce93d8\" stroke-width=\"1.2\" fill=\"none\"/>\n        <circle cx=\"27\" cy=\"30.5\" r=\"1.5\" fill=\"#7c4dff\" opacity=\"0.9\"/>\n        <line x1=\"27\" y1=\"30.5\" x2=\"27\" y2=\"33\" stroke=\"#7c4dff\" stroke-width=\"1.2\"/>\n        <path d=\"M20 24 L20 20\" stroke=\"#7c4dff\" stroke-width=\"0.8\" opacity=\"0.3\" stroke-dasharray=\"2 2\"/>\n        <path d=\"M34 24 L34 20\" stroke=\"#7c4dff\" stroke-width=\"0.8\" opacity=\"0.3\" stroke-dasharray=\"2 2\"/>\n      </svg>"
  },
  {
    "label": "Cloud Sync",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg4\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a1a2e\"/><stop offset=\"100%\" stop-color=\"#050c1a\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg4)\"/>\n        <path d=\"M18 32 C14 32 11 29 11 25.5 C11 22.5 13 20 16 19.5 C16.5 16.5 19.5 14 23 14 C25.5 14 27.7 15.2 29 17 C30 16.4 31.2 16 32.5 16 C36.5 16 39.5 19 39.5 23 C39.5 23.3 39.5 23.7 39.4 24 C42.5 24.5 44 26.8 44 29 C44 31.5 41.8 33.5 39 33.5 L18 32Z\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.4\"/>\n        <path d=\"M16 34 C12 34 9 31 9 27.5\" stroke=\"#4fc3f7\" stroke-width=\"0\" fill=\"none\"/>\n        <circle cx=\"27\" cy=\"33\" r=\"6\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.4\" opacity=\"0.8\"/>\n        <path d=\"M24 33 L27 30 L30 33\" stroke=\"#4fc3f7\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>\n        <path d=\"M30 33 L27 36 L24 33\" stroke=\"#4fc3f7\" stroke-width=\"1.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "Pulse",
    "category": "Media",
    "tone": "green",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg5\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a1f0a\"/><stop offset=\"100%\" stop-color=\"#040d04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg5)\"/>\n        <path d=\"M8 27 L15 27 L18 20 L22 34 L26 23 L29 31 L32 27 L46 27\" stroke=\"#66bb6a\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <circle cx=\"8\" cy=\"27\" r=\"2\" fill=\"#66bb6a\" opacity=\"0.5\"/>\n        <circle cx=\"46\" cy=\"27\" r=\"2\" fill=\"#66bb6a\" opacity=\"0.5\"/>\n        <line x1=\"8\" y1=\"38\" x2=\"46\" y2=\"38\" stroke=\"#66bb6a\" stroke-width=\"0.5\" opacity=\"0.2\"/>\n        <line x1=\"8\" y1=\"16\" x2=\"46\" y2=\"16\" stroke=\"#66bb6a\" stroke-width=\"0.5\" opacity=\"0.2\"/>\n        <rect x=\"8\" y=\"16\" width=\"38\" height=\"22\" rx=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"0.5\" opacity=\"0.15\"/>\n      </svg>"
  },
  {
    "label": "Battery",
    "category": "Productivity",
    "tone": "amber",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg6\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1000\"/><stop offset=\"100%\" stop-color=\"#0a0600\"/></radialGradient>\n        <linearGradient id=\"batt\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffb74d\" stop-opacity=\"0.9\"/><stop offset=\"100%\" stop-color=\"#f57c00\" stop-opacity=\"0.7\"/></linearGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg6)\"/>\n        <rect x=\"14\" y=\"18\" width=\"26\" height=\"18\" rx=\"4\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.5\"/>\n        <rect x=\"40\" y=\"23\" width=\"4\" height=\"8\" rx=\"2\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <rect x=\"17\" y=\"21\" width=\"6\" height=\"12\" rx=\"2\" fill=\"url(#batt)\" opacity=\"0.9\"/>\n        <rect x=\"25\" y=\"21\" width=\"6\" height=\"12\" rx=\"2\" fill=\"url(#batt)\" opacity=\"0.65\"/>\n        <rect x=\"33\" y=\"21\" width=\"5\" height=\"12\" rx=\"2\" fill=\"url(#batt)\" opacity=\"0.35\"/>\n        <path d=\"M25 11 L22 18 L28 18 L25 11Z\" fill=\"#ffb74d\" opacity=\"0.7\"/>\n        <path d=\"M29 11 L26 18 L32 18 L29 11Z\" fill=\"#ffb74d\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "Analytics",
    "category": "Finance",
    "tone": "cyan",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg7\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0f1a2e\"/><stop offset=\"100%\" stop-color=\"#060c18\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg7)\"/>\n        <rect x=\"11\" y=\"34\" width=\"6\" height=\"9\" rx=\"2\" fill=\"#4fc3f7\" opacity=\"0.9\"/>\n        <rect x=\"20\" y=\"28\" width=\"6\" height=\"15\" rx=\"2\" fill=\"#7c4dff\" opacity=\"0.9\"/>\n        <rect x=\"29\" y=\"20\" width=\"6\" height=\"23\" rx=\"2\" fill=\"#4fc3f7\" opacity=\"0.7\"/>\n        <rect x=\"38\" y=\"25\" width=\"6\" height=\"18\" rx=\"2\" fill=\"#7c4dff\" opacity=\"0.6\"/>\n        <path d=\"M11 34 L23 28 L32 20 L41 25\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <circle cx=\"11\" cy=\"34\" r=\"2\" fill=\"#4fc3f7\"/>\n        <circle cx=\"23\" cy=\"28\" r=\"2\" fill=\"#7c4dff\"/>\n        <circle cx=\"32\" cy=\"20\" r=\"2\" fill=\"#4fc3f7\"/>\n        <circle cx=\"41\" cy=\"25\" r=\"2\" fill=\"#7c4dff\"/>\n        <line x1=\"11\" y1=\"43\" x2=\"44\" y2=\"43\" stroke=\"#4fc3f7\" stroke-width=\"0.8\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "Biometric",
    "category": "System",
    "tone": "purple",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg8\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#160a2a\"/><stop offset=\"100%\" stop-color=\"#080412\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg8)\"/>\n        <path d=\"M27 15 C20 15 15 20 15 27 C15 34 20 39 27 39 C34 39 39 34 39 27\" stroke=\"#ce93d8\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M27 19 C22 19 19 23 19 27 C19 31 22 35 27 35 C32 35 35 31 35 27\" stroke=\"#7c4dff\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M27 23 C24 23 23 25 23 27 C23 29 24 31 27 31 C30 31 31 29 31 27 C31 25 30 23 27 23\" stroke=\"#ce93d8\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"2\" fill=\"#7c4dff\"/>\n        <path d=\"M36 15 C37.5 13.5 39 13 40 14\" stroke=\"#7c4dff\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M40 14 C42 16 42 18 40 20\" stroke=\"#7c4dff\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n        <path d=\"M40 20 L38 18\" stroke=\"#7c4dff\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "Satellite",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg9\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#081828\"/><stop offset=\"100%\" stop-color=\"#020810\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg9)\"/>\n        <rect x=\"23\" y=\"23\" width=\"8\" height=\"8\" rx=\"2\" fill=\"#4fc3f7\" opacity=\"0.3\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <rect x=\"13\" y=\"24.5\" width=\"10\" height=\"5\" rx=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n        <rect x=\"31\" y=\"24.5\" width=\"10\" height=\"5\" rx=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n        <rect x=\"24.5\" y=\"13\" width=\"5\" height=\"10\" rx=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n        <path d=\"M35 19 L27 27\" stroke=\"#4fc3f7\" stroke-width=\"1\" opacity=\"0.5\" stroke-dasharray=\"2 2\"/>\n        <circle cx=\"38\" cy=\"16\" r=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <path d=\"M37 26 C41 30 41 34 38 37\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M35 28 C37.5 31 37.5 34 35 37\" stroke=\"#4fc3f7\" stroke-width=\"1\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.3\"/>\n        <line x1=\"14\" y1=\"41\" x2=\"40\" y2=\"41\" stroke=\"#4fc3f7\" stroke-width=\"0.5\" opacity=\"0.15\"/>\n      </svg>"
  },
  {
    "label": "Terminal",
    "category": "System",
    "tone": "green",
    "badge": "PRO",
    "badgeTone": "pro",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg10\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a160a\"/><stop offset=\"100%\" stop-color=\"#040a04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg10)\"/>\n        <rect x=\"10\" y=\"14\" width=\"34\" height=\"26\" rx=\"5\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.3\" opacity=\"0.7\"/>\n        <path d=\"M10 20 L44 20\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.3\"/>\n        <circle cx=\"16\" cy=\"17\" r=\"1.5\" fill=\"#66bb6a\" opacity=\"0.5\"/>\n        <circle cx=\"21\" cy=\"17\" r=\"1.5\" fill=\"#66bb6a\" opacity=\"0.35\"/>\n        <circle cx=\"26\" cy=\"17\" r=\"1.5\" fill=\"#66bb6a\" opacity=\"0.2\"/>\n        <path d=\"M16 26 L20 29 L16 32\" stroke=\"#66bb6a\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <line x1=\"23\" y1=\"32\" x2=\"32\" y2=\"32\" stroke=\"#66bb6a\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.8\"/>\n        <rect x=\"10\" y=\"42\" width=\"34\" height=\"2\" rx=\"1\" fill=\"#66bb6a\" opacity=\"0.15\"/>\n        <path d=\"M27 36 L27 38\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <path d=\"M20 36 L34 36\" stroke=\"#66bb6a\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "Camera",
    "category": "Media",
    "tone": "coral",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg11\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a0a04\"/><stop offset=\"100%\" stop-color=\"#0a0400\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg11)\"/>\n        <path d=\"M9 20 L9 37 C9 38.6 10.3 40 12 40 L42 40 C43.7 40 45 38.6 45 37 L45 20 C45 18.3 43.7 17 42 17 L36 17 L34 14 L20 14 L18 17 L12 17 C10.3 17 9 18.3 9 20Z\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.3\"/>\n        <circle cx=\"27\" cy=\"28\" r=\"7\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.3\"/>\n        <circle cx=\"27\" cy=\"28\" r=\"4\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <circle cx=\"27\" cy=\"28\" r=\"1.5\" fill=\"#ff7043\" opacity=\"0.9\"/>\n        <circle cx=\"39\" cy=\"21\" r=\"2\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1\" opacity=\"0.6\"/>\n        <path d=\"M24 28 C24.5 24 30 24 30 28\" stroke=\"#ff7043\" stroke-width=\"0.8\" fill=\"none\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "Rocket",
    "category": "Media",
    "tone": "cyan",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg12\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a0f1e\"/><stop offset=\"100%\" stop-color=\"#040710\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg12)\"/>\n        <path d=\"M27 10 C27 10 20 18 20 28 L20 34 L27 38 L34 34 L34 28 C34 18 27 10 27 10Z\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.4\"/>\n        <path d=\"M22 28 C22 28 18 30 16 36 L20 34\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <path d=\"M32 28 C32 28 36 30 38 36 L34 34\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <circle cx=\"27\" cy=\"22\" r=\"3\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <circle cx=\"27\" cy=\"22\" r=\"1\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <path d=\"M24 38 Q27 44 30 38\" stroke=\"#ff7043\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.8\"/>\n        <path d=\"M25.5 40 Q27 46 28.5 40\" stroke=\"#ffb74d\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.6\"/>\n      </svg>"
  },
  {
    "label": "Messages",
    "category": "Social",
    "tone": "purple",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg13\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#150a25\"/><stop offset=\"100%\" stop-color=\"#080412\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg13)\"/>\n        <path d=\"M10 18 C10 15.8 11.8 14 14 14 L40 14 C42.2 14 44 15.8 44 18 L44 32 C44 34.2 42.2 36 40 36 L22 36 L14 42 L14 36 C11.8 36 10 34.2 10 32 Z\" fill=\"none\" stroke=\"#ce93d8\" stroke-width=\"1.4\"/>\n        <line x1=\"17\" y1=\"22\" x2=\"37\" y2=\"22\" stroke=\"#7c4dff\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>\n        <line x1=\"17\" y1=\"27\" x2=\"32\" y2=\"27\" stroke=\"#7c4dff\" stroke-width=\"1.3\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n        <circle cx=\"37\" cy=\"27\" r=\"1.5\" fill=\"#ce93d8\" opacity=\"0.5\"/>\n        <line x1=\"17\" y1=\"32\" x2=\"26\" y2=\"32\" stroke=\"#7c4dff\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "Diamond",
    "category": "Finance",
    "tone": "amber",
    "badge": "PRO",
    "badgeTone": "pro",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg14\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1200\"/><stop offset=\"100%\" stop-color=\"#0a0800\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg14)\"/>\n        <polygon points=\"27,13 38,21 34,38 20,38 16,21\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.4\"/>\n        <polygon points=\"27,13 34,21 27,38 20,21\" fill=\"#ffb74d\" opacity=\"0.12\"/>\n        <polygon points=\"16,21 38,21 27,38\" fill=\"#ffb74d\" opacity=\"0.08\"/>\n        <line x1=\"16\" y1=\"21\" x2=\"20\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.5\"/>\n        <line x1=\"34\" y1=\"21\" x2=\"38\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.5\"/>\n        <polygon points=\"27,13 20,21 34,21\" fill=\"#ffb74d\" opacity=\"0.2\"/>\n        <line x1=\"27\" y1=\"13\" x2=\"20\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"1\" opacity=\"0.6\"/>\n        <line x1=\"27\" y1=\"13\" x2=\"34\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"1\" opacity=\"0.6\"/>\n        <line x1=\"27\" y1=\"13\" x2=\"27\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.4\"/>\n        <line x1=\"20\" y1=\"21\" x2=\"27\" y2=\"38\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.5\"/>\n        <line x1=\"34\" y1=\"21\" x2=\"27\" y2=\"38\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.5\"/>\n        <line x1=\"27\" y1=\"21\" x2=\"27\" y2=\"38\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "GPS",
    "category": "Media",
    "tone": "coral",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg15\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#180a04\"/><stop offset=\"100%\" stop-color=\"#0a0300\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg15)\"/>\n        <path d=\"M27 11 C21.5 11 17 15.5 17 21 C17 28 27 40 27 40 C27 40 37 28 37 21 C37 15.5 32.5 11 27 11Z\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.4\"/>\n        <circle cx=\"27\" cy=\"21\" r=\"4.5\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.2\"/>\n        <circle cx=\"27\" cy=\"21\" r=\"1.5\" fill=\"#ff7043\" opacity=\"0.9\"/>\n        <path d=\"M20 40 C22 39 25 38 27 38 C29 38 32 39 34 40\" stroke=\"#ff7043\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M37 23 C40 23 44 24 44 25\" stroke=\"#ff7043\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.35\"/>\n        <path d=\"M17 23 C14 23 10 24 10 25\" stroke=\"#ff7043\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.35\"/>\n      </svg>"
  },
  {
    "label": "Settings",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg16\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0f1520\"/><stop offset=\"100%\" stop-color=\"#060a12\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg16)\"/>\n        <path d=\"M27 14 L29 10 L31 14 L35 12 L34 16.5 L38 16.5 L36 20 L40 22 L36 24 L38 28 L34 27.5 L35 32 L31 30 L29 34 L27 30 L25 34 L23 30 L19 32 L20 27.5 L16 28 L18 24 L14 22 L18 20 L16 16.5 L20 16.5 L19 12 L23 14 L25 10 Z\" fill=\"none\" stroke=\"#78909c\" stroke-width=\"1.2\"/>\n        <circle cx=\"27\" cy=\"22\" r=\"4.5\" fill=\"none\" stroke=\"#90a4ae\" stroke-width=\"1.3\"/>\n        <circle cx=\"27\" cy=\"22\" r=\"2\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "Boost",
    "category": "Finance",
    "tone": "amber",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg17\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1000\"/><stop offset=\"100%\" stop-color=\"#0a0600\"/></radialGradient>\n        <linearGradient id=\"bolt\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffee58\"/><stop offset=\"100%\" stop-color=\"#ff8f00\"/></linearGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg17)\"/>\n        <path d=\"M31 10 L19 29 L26 29 L23 44 L35 25 L28 25 Z\" fill=\"url(#bolt)\" opacity=\"0.9\"/>\n        <path d=\"M31 10 L19 29 L26 29 L23 44 L35 25 L28 25 Z\" fill=\"none\" stroke=\"#ffee58\" stroke-width=\"0.8\" opacity=\"0.6\"/>\n        <line x1=\"38\" y1=\"14\" x2=\"42\" y2=\"12\" stroke=\"#ffee58\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n        <line x1=\"40\" y1=\"20\" x2=\"45\" y2=\"20\" stroke=\"#ffee58\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.35\"/>\n        <line x1=\"12\" y1=\"28\" x2=\"8\" y2=\"26\" stroke=\"#ffee58\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.3\"/>\n        <line x1=\"12\" y1=\"34\" x2=\"8\" y2=\"36\" stroke=\"#ffee58\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.2\"/>\n      </svg>"
  },
  {
    "label": "Wi-Fi 6E",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg18\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#091520\"/><stop offset=\"100%\" stop-color=\"#040a12\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg18)\"/>\n        <path d=\"M12 24 C18 17 36 17 42 24\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.9\"/>\n        <path d=\"M16 29 C20 24 34 24 38 29\" stroke=\"#4fc3f7\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n        <path d=\"M20 34 C22 31 32 31 34 34\" stroke=\"#4fc3f7\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n        <circle cx=\"27\" cy=\"40\" r=\"2.5\" fill=\"#4fc3f7\" opacity=\"0.9\"/>\n        <text x=\"38\" y=\"20\" font-size=\"7\" font-family=\"monospace\" fill=\"#4fc3f7\" opacity=\"0.6\">6E</text>\n      </svg>"
  },
  {
    "label": "Cloud Folder",
    "category": "Productivity",
    "tone": "green",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg19\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#091509\"/><stop offset=\"100%\" stop-color=\"#040a04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg19)\"/>\n        <path d=\"M10 22 C10 20 11.8 18 14 18 L23 18 L25 15 L40 15 C42.2 15 44 16.8 44 19 L44 38 C44 40.2 42.2 42 40 42 L14 42 C11.8 42 10 40.2 10 38 Z\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.3\" opacity=\"0.7\"/>\n        <path d=\"M20 31 C17 31 15 29 15 27 C15 25.2 16.2 23.8 17.8 23.3 C18 21.5 19.5 20 21.5 20 C22.7 20 23.7 20.5 24.3 21.3 C25 21 25.7 20.8 26.5 20.8 C28.5 20.8 30 22.3 30 24.3 C30 24.5 30 24.6 29.9 24.8 C31.5 25.1 32.5 26.4 32.5 27.8 C32.5 29.6 31 31 29 31 Z\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.2\"/>\n        <path d=\"M24 33 L24 29\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <path d=\"M22 31 L24 29 L26 31\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/>\n      </svg>"
  },
  {
    "label": "QR Code",
    "category": "Productivity",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg20\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0d1520\"/><stop offset=\"100%\" stop-color=\"#060a10\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg20)\"/>\n        <rect x=\"12\" y=\"12\" width=\"12\" height=\"12\" rx=\"2\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <rect x=\"15\" y=\"15\" width=\"6\" height=\"6\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <rect x=\"30\" y=\"12\" width=\"12\" height=\"12\" rx=\"2\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <rect x=\"33\" y=\"15\" width=\"6\" height=\"6\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <rect x=\"12\" y=\"30\" width=\"12\" height=\"12\" rx=\"2\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <rect x=\"15\" y=\"33\" width=\"6\" height=\"6\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <rect x=\"30\" y=\"30\" width=\"5\" height=\"5\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n        <rect x=\"37\" y=\"30\" width=\"5\" height=\"5\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.5\"/>\n        <rect x=\"30\" y=\"37\" width=\"5\" height=\"5\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.7\"/>\n        <rect x=\"37\" y=\"37\" width=\"5\" height=\"5\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "Calendar",
    "category": "Productivity",
    "tone": "coral",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg21\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a0a06\"/><stop offset=\"100%\" stop-color=\"#0a0402\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg21)\"/>\n        <rect x=\"10\" y=\"16\" width=\"34\" height=\"28\" rx=\"4\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.3\"/>\n        <line x1=\"10\" y1=\"24\" x2=\"44\" y2=\"24\" stroke=\"#ff7043\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"20\" y1=\"12\" x2=\"20\" y2=\"20\" stroke=\"#ff7043\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n        <line x1=\"34\" y1=\"12\" x2=\"34\" y2=\"20\" stroke=\"#ff7043\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.7\"/>\n        <circle cx=\"18\" cy=\"30\" r=\"2\" fill=\"#ff7043\" opacity=\"0.7\"/>\n        <circle cx=\"27\" cy=\"30\" r=\"2\" fill=\"#ff7043\" opacity=\"0.9\"/>\n        <circle cx=\"36\" cy=\"30\" r=\"2\" fill=\"#ff7043\" opacity=\"0.5\"/>\n        <circle cx=\"18\" cy=\"38\" r=\"2\" fill=\"#ff7043\" opacity=\"0.4\"/>\n        <circle cx=\"27\" cy=\"38\" r=\"2\" fill=\"#ff7043\" opacity=\"0.6\"/>\n        <line x1=\"31\" y1=\"36\" x2=\"40\" y2=\"36\" stroke=\"#ff7043\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "VPN",
    "category": "System",
    "tone": "purple",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg22\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#12082a\"/><stop offset=\"100%\" stop-color=\"#080415\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg22)\"/>\n        <path d=\"M27 10 L40 16 L40 30 C40 37 34 42 27 45 C20 42 14 37 14 30 L14 16 Z\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.5\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"8\" fill=\"none\" stroke=\"#ce93d8\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"4\" ry=\"8\" fill=\"none\" stroke=\"#ce93d8\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"19\" y1=\"27\" x2=\"35\" y2=\"27\" stroke=\"#ce93d8\" stroke-width=\"0.8\" opacity=\"0.4\"/>\n        <line x1=\"20\" y1=\"22\" x2=\"34\" y2=\"22\" stroke=\"#ce93d8\" stroke-width=\"0.6\" opacity=\"0.3\"/>\n        <line x1=\"20\" y1=\"32\" x2=\"34\" y2=\"32\" stroke=\"#ce93d8\" stroke-width=\"0.6\" opacity=\"0.3\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"2\" fill=\"#7c4dff\" opacity=\"0.9\"/>\n      </svg>"
  },
  {
    "label": "Audio",
    "category": "Media",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg23\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a1220\"/><stop offset=\"100%\" stop-color=\"#050810\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg23)\"/>\n        <path d=\"M15 30 C15 21 20 14 27 14 C34 14 39 21 39 30\" stroke=\"#4fc3f7\" stroke-width=\"1.4\" fill=\"none\"/>\n        <rect x=\"11\" y=\"28\" width=\"7\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.3\"/>\n        <rect x=\"13\" y=\"30\" width=\"3\" height=\"8\" rx=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.3\"/>\n        <rect x=\"36\" y=\"28\" width=\"7\" height=\"12\" rx=\"3.5\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.3\"/>\n        <rect x=\"38\" y=\"30\" width=\"3\" height=\"8\" rx=\"1.5\" fill=\"#4fc3f7\" opacity=\"0.3\"/>\n        <path d=\"M39 38 C39 40 37.5 41.5 35.5 41.5 L34 41.5\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n      </svg>"
  },
  {
    "label": "NFT Token",
    "category": "Finance",
    "tone": "amber",
    "badge": "PRO",
    "badgeTone": "pro",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg24\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1500\"/><stop offset=\"100%\" stop-color=\"#0a0a00\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg24)\"/>\n        <polygon points=\"27,12 38,19 38,33 27,40 16,33 16,19\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.4\"/>\n        <polygon points=\"27,16 34,20.5 34,30 27,34.5 20,30 20,20.5\" fill=\"#ffb74d\" opacity=\"0.1\"/>\n        <text x=\"27\" y=\"29\" text-anchor=\"middle\" font-size=\"10\" font-family=\"'Orbitron',monospace\" fill=\"#ffb74d\" font-weight=\"700\" opacity=\"0.9\">NFT</text>\n        <circle cx=\"27\" cy=\"12\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.8\"/>\n        <circle cx=\"38\" cy=\"19\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <circle cx=\"38\" cy=\"33\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <circle cx=\"27\" cy=\"40\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.8\"/>\n        <circle cx=\"16\" cy=\"33\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <circle cx=\"16\" cy=\"19\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n      </svg>"
  },
  {
    "label": "Notifications",
    "category": "Social",
    "tone": "coral",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg25\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#180a04\"/><stop offset=\"100%\" stop-color=\"#0a0400\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg25)\"/>\n        <path d=\"M27 10 C27 10 24 12 24 16 C19 18 17 22 17 27 L17 34 L11 37 L43 37 L37 34 L37 27 C37 22 35 18 30 16 C30 12 27 10 27 10Z\" fill=\"none\" stroke=\"#ff7043\" stroke-width=\"1.4\"/>\n        <path d=\"M23 37 C23 39.2 24.8 41 27 41 C29.2 41 31 39.2 31 37\" stroke=\"#ff7043\" stroke-width=\"1.3\" fill=\"none\"/>\n        <circle cx=\"37\" cy=\"14\" r=\"5\" fill=\"#ff7043\" opacity=\"0.9\"/>\n        <circle cx=\"37\" cy=\"14\" r=\"3\" fill=\"#ff5722\"/>\n        <line x1=\"37\" y1=\"11\" x2=\"37\" y2=\"14\" stroke=\"white\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\"0.8\"/>\n        <circle cx=\"37\" cy=\"15.5\" r=\"0.8\" fill=\"white\" opacity=\"0.8\"/>\n      </svg>"
  },
  {
    "label": "Timer",
    "category": "Productivity",
    "tone": "green",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg26\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a1a0a\"/><stop offset=\"100%\" stop-color=\"#040a04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg26)\"/>\n        <circle cx=\"27\" cy=\"29\" r=\"14\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.5\"/>\n        <line x1=\"22\" y1=\"12\" x2=\"32\" y2=\"12\" stroke=\"#66bb6a\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"12\" x2=\"27\" y2=\"15\" stroke=\"#66bb6a\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"29\" x2=\"27\" y2=\"22\" stroke=\"#66bb6a\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"29\" x2=\"33\" y2=\"25\" stroke=\"#66bb6a\" stroke-width=\"1.5\" stroke-linecap=\"round\"/>\n        <circle cx=\"27\" cy=\"29\" r=\"1.5\" fill=\"#66bb6a\"/>\n        <line x1=\"27\" y1=\"17\" x2=\"27\" y2=\"19\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"27\" y1=\"39\" x2=\"27\" y2=\"41\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"37\" y1=\"29\" x2=\"39\" y2=\"29\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"15\" y1=\"29\" x2=\"17\" y2=\"29\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "DNA",
    "category": "System",
    "tone": "purple",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg27\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#130a22\"/><stop offset=\"100%\" stop-color=\"#080412\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg27)\"/>\n        <path d=\"M20 10 C28 15 22 22 30 27 C22 32 28 39 20 44\" stroke=\"#7c4dff\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M34 10 C26 15 32 22 24 27 C32 32 26 39 34 44\" stroke=\"#ce93d8\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/>\n        <line x1=\"22\" y1=\"16\" x2=\"32\" y2=\"16\" stroke=\"#7c4dff\" stroke-width=\"1\" opacity=\"0.6\"/>\n        <line x1=\"20\" y1=\"22\" x2=\"34\" y2=\"22\" stroke=\"#ce93d8\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <line x1=\"22\" y1=\"27\" x2=\"32\" y2=\"27\" stroke=\"#7c4dff\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <line x1=\"20\" y1=\"32\" x2=\"34\" y2=\"32\" stroke=\"#ce93d8\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <line x1=\"22\" y1=\"38\" x2=\"32\" y2=\"38\" stroke=\"#7c4dff\" stroke-width=\"1\" opacity=\"0.6\"/>\n        <circle cx=\"22\" cy=\"16\" r=\"1.5\" fill=\"#7c4dff\"/>\n        <circle cx=\"32\" cy=\"16\" r=\"1.5\" fill=\"#ce93d8\"/>\n        <circle cx=\"22\" cy=\"27\" r=\"1.5\" fill=\"#7c4dff\"/>\n        <circle cx=\"32\" cy=\"27\" r=\"1.5\" fill=\"#ce93d8\"/>\n        <circle cx=\"22\" cy=\"38\" r=\"1.5\" fill=\"#7c4dff\"/>\n        <circle cx=\"32\" cy=\"38\" r=\"1.5\" fill=\"#ce93d8\"/>\n      </svg>"
  },
  {
    "label": "Power",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg28\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0c1018\"/><stop offset=\"100%\" stop-color=\"#060810\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg28)\"/>\n        <path d=\"M21 16 C16 19 13 23.5 13 29 C13 36.7 19.3 43 27 43 C34.7 43 41 36.7 41 29 C41 23.5 38 19 33 16\" stroke=\"#4fc3f7\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"12\" x2=\"27\" y2=\"29\" stroke=\"#4fc3f7\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n        <circle cx=\"27\" cy=\"29\" r=\"3\" fill=\"#4fc3f7\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "AR Glasses",
    "category": "Media",
    "tone": "amber",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg29\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1000\"/><stop offset=\"100%\" stop-color=\"#0a0600\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg29)\"/>\n        <rect x=\"10\" y=\"22\" width=\"15\" height=\"11\" rx=\"5\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.4\"/>\n        <rect x=\"29\" y=\"22\" width=\"15\" height=\"11\" rx=\"5\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.4\"/>\n        <line x1=\"25\" y1=\"27.5\" x2=\"29\" y2=\"27.5\" stroke=\"#ffb74d\" stroke-width=\"1.4\"/>\n        <line x1=\"7\" y1=\"24\" x2=\"10\" y2=\"24\" stroke=\"#ffb74d\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>\n        <line x1=\"44\" y1=\"24\" x2=\"47\" y2=\"24\" stroke=\"#ffb74d\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>\n        <rect x=\"13\" y=\"25\" width=\"9\" height=\"5\" rx=\"2.5\" fill=\"#ffb74d\" opacity=\"0.15\"/>\n        <rect x=\"32\" y=\"25\" width=\"9\" height=\"5\" rx=\"2.5\" fill=\"#ffb74d\" opacity=\"0.25\"/>\n        <line x1=\"34\" y1=\"26\" x2=\"34\" y2=\"32\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.5\"/>\n        <line x1=\"37\" y1=\"25.5\" x2=\"37\" y2=\"32\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.4\"/>\n        <line x1=\"34\" y1=\"32\" x2=\"39\" y2=\"32\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.3\"/>\n        <circle cx=\"37\" cy=\"32\" r=\"1\" fill=\"#ffb74d\" opacity=\"0.7\"/>\n      </svg>"
  },
  {
    "label": "Bitcoin",
    "category": "Finance",
    "tone": "amber",
    "badge": "PRO",
    "badgeTone": "pro",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg30\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1400\"/><stop offset=\"100%\" stop-color=\"#0a0a00\"/></radialGradient>\n        <radialGradient id=\"coin\" cx=\"40%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#ffe082\"/><stop offset=\"100%\" stop-color=\"#f57f17\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg30)\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"14\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.5\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"11\" fill=\"#ffb74d\" opacity=\"0.1\"/>\n        <ellipse cx=\"25\" cy=\"27\" rx=\"9\" ry=\"11\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"0.5\" opacity=\"0.3\"/>\n        <text x=\"27\" y=\"31\" text-anchor=\"middle\" font-size=\"13\" font-family=\"'Orbitron',monospace\" fill=\"#ffb74d\" font-weight=\"700\" opacity=\"0.95\">₿</text>\n        <circle cx=\"27\" cy=\"16\" r=\"1.5\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <circle cx=\"27\" cy=\"38\" r=\"1.5\" fill=\"#ffb74d\" opacity=\"0.6\"/>\n        <circle cx=\"13\" cy=\"27\" r=\"1.5\" fill=\"#ffb74d\" opacity=\"0.4\"/>\n        <circle cx=\"41\" cy=\"27\" r=\"1.5\" fill=\"#ffb74d\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "Retina Scan",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg31\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#08141e\"/><stop offset=\"100%\" stop-color=\"#040a10\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg31)\"/>\n        <path d=\"M8 27 C8 27 16 16 27 16 C38 16 46 27 46 27 C46 27 38 38 27 38 C16 38 8 27 8 27Z\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.4\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"7\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"3.5\" fill=\"#4fc3f7\" opacity=\"0.8\"/>\n        <circle cx=\"29\" cy=\"25\" r=\"1.2\" fill=\"white\" opacity=\"0.6\"/>\n        <path d=\"M10 20 L14 20\" stroke=\"#4fc3f7\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M10 34 L14 34\" stroke=\"#4fc3f7\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M40 20 L44 20\" stroke=\"#4fc3f7\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n        <path d=\"M40 34 L44 34\" stroke=\"#4fc3f7\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "Drone",
    "category": "Media",
    "tone": "green",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg32\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a180a\"/><stop offset=\"100%\" stop-color=\"#040a04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg32)\"/>\n        <rect x=\"21\" y=\"23\" width=\"12\" height=\"8\" rx=\"3\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.2\"/>\n        <line x1=\"21\" y1=\"27\" x2=\"13\" y2=\"20\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"33\" y1=\"27\" x2=\"41\" y2=\"20\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"21\" y1=\"27\" x2=\"13\" y2=\"34\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"33\" y1=\"27\" x2=\"41\" y2=\"34\" stroke=\"#66bb6a\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <ellipse cx=\"13\" cy=\"19\" rx=\"5\" ry=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <ellipse cx=\"41\" cy=\"19\" rx=\"5\" ry=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <ellipse cx=\"13\" cy=\"35\" rx=\"5\" ry=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <ellipse cx=\"41\" cy=\"35\" rx=\"5\" ry=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.7\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"2\" fill=\"#66bb6a\" opacity=\"0.5\"/>\n        <line x1=\"27\" y1=\"31\" x2=\"27\" y2=\"36\" stroke=\"#66bb6a\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n        <circle cx=\"27\" cy=\"37\" r=\"1.5\" fill=\"#66bb6a\" opacity=\"0.6\"/>\n      </svg>"
  },
  {
    "label": "Waveform",
    "category": "Media",
    "tone": "coral",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg33\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#180c08\"/><stop offset=\"100%\" stop-color=\"#0a0504\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg33)\"/>\n        <line x1=\"10\" y1=\"27\" x2=\"14\" y2=\"27\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"16\" y1=\"22\" x2=\"16\" y2=\"32\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"19\" y1=\"19\" x2=\"19\" y2=\"35\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"22\" y1=\"24\" x2=\"22\" y2=\"30\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"25\" y1=\"16\" x2=\"25\" y2=\"38\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"28\" y1=\"21\" x2=\"28\" y2=\"33\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"31\" y1=\"17\" x2=\"31\" y2=\"37\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"34\" y1=\"23\" x2=\"34\" y2=\"31\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"37\" y1=\"20\" x2=\"37\" y2=\"34\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"40\" y1=\"24\" x2=\"40\" y2=\"30\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"43\" y1=\"27\" x2=\"44\" y2=\"27\" stroke=\"#ff7043\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n      </svg>"
  },
  {
    "label": "3D Cube",
    "category": "System",
    "tone": "purple",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg34\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#120a22\"/><stop offset=\"100%\" stop-color=\"#080412\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg34)\"/>\n        <polygon points=\"27,12 40,20 40,36 27,44 14,36 14,20\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.4\"/>\n        <line x1=\"27\" y1=\"12\" x2=\"27\" y2=\"28\" stroke=\"#ce93d8\" stroke-width=\"1.2\" opacity=\"0.5\"/>\n        <line x1=\"40\" y1=\"20\" x2=\"27\" y2=\"28\" stroke=\"#7c4dff\" stroke-width=\"1.2\" opacity=\"0.5\"/>\n        <line x1=\"14\" y1=\"20\" x2=\"27\" y2=\"28\" stroke=\"#7c4dff\" stroke-width=\"1.2\" opacity=\"0.5\"/>\n        <polygon points=\"27,12 40,20 27,28 14,20\" fill=\"#7c4dff\" opacity=\"0.15\"/>\n        <polygon points=\"27,28 40,20 40,36 27,44\" fill=\"#7c4dff\" opacity=\"0.08\"/>\n        <polygon points=\"27,28 14,20 14,36 27,44\" fill=\"#7c4dff\" opacity=\"0.12\"/>\n        <circle cx=\"27\" cy=\"28\" r=\"2\" fill=\"#ce93d8\" opacity=\"0.8\"/>\n      </svg>"
  },
  {
    "label": "Server",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg35\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0c1220\"/><stop offset=\"100%\" stop-color=\"#060910\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg35)\"/>\n        <rect x=\"12\" y=\"13\" width=\"30\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\"/>\n        <rect x=\"12\" y=\"24\" width=\"30\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" opacity=\"0.7\"/>\n        <rect x=\"12\" y=\"35\" width=\"30\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.2\" opacity=\"0.5\"/>\n        <circle cx=\"36\" cy=\"17.5\" r=\"2\" fill=\"#66bb6a\" opacity=\"0.9\"/>\n        <circle cx=\"36\" cy=\"28.5\" r=\"2\" fill=\"#66bb6a\" opacity=\"0.6\"/>\n        <circle cx=\"36\" cy=\"39.5\" r=\"2\" fill=\"#ffb74d\" opacity=\"0.7\"/>\n        <rect x=\"15\" y=\"16\" width=\"14\" height=\"3\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.2\"/>\n        <rect x=\"15\" y=\"27\" width=\"10\" height=\"3\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.15\"/>\n        <rect x=\"15\" y=\"38\" width=\"12\" height=\"3\" rx=\"1\" fill=\"#4fc3f7\" opacity=\"0.1\"/>\n      </svg>"
  },
  {
    "label": "Smartwatch",
    "category": "Productivity",
    "tone": "green",
    "badge": "NEW",
    "badgeTone": "new",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg36\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#0a1a0a\"/><stop offset=\"100%\" stop-color=\"#040a04\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg36)\"/>\n        <rect x=\"19\" y=\"17\" width=\"16\" height=\"20\" rx=\"5\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1.4\"/>\n        <rect x=\"21\" y=\"14\" width=\"12\" height=\"4\" rx=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <rect x=\"21\" y=\"36\" width=\"12\" height=\"4\" rx=\"2\" fill=\"none\" stroke=\"#66bb6a\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <rect x=\"22\" y=\"20\" width=\"10\" height=\"10\" rx=\"2\" fill=\"#66bb6a\" opacity=\"0.1\"/>\n        <path d=\"M27 22 L27 26 L30 28\" stroke=\"#66bb6a\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n        <line x1=\"22\" y1=\"33\" x2=\"26\" y2=\"33\" stroke=\"#66bb6a\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n        <line x1=\"28\" y1=\"33\" x2=\"32\" y2=\"33\" stroke=\"#66bb6a\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.3\"/>\n        <line x1=\"35\" y1=\"24\" x2=\"38\" y2=\"24\" stroke=\"#66bb6a\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.5\"/>\n        <line x1=\"35\" y1=\"27\" x2=\"38\" y2=\"27\" stroke=\"#66bb6a\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.3\"/>\n      </svg>"
  },
  {
    "label": "Globe",
    "category": "System",
    "tone": "cyan",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg37\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#091520\"/><stop offset=\"100%\" stop-color=\"#040a12\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg37)\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"14\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1.3\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"6\" ry=\"14\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1\" opacity=\"0.5\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"14\" ry=\"6\" fill=\"none\" stroke=\"#4fc3f7\" stroke-width=\"1\" opacity=\"0.4\"/>\n        <line x1=\"13\" y1=\"27\" x2=\"41\" y2=\"27\" stroke=\"#4fc3f7\" stroke-width=\"0.8\" opacity=\"0.3\"/>\n        <line x1=\"27\" y1=\"13\" x2=\"27\" y2=\"41\" stroke=\"#4fc3f7\" stroke-width=\"0.8\" opacity=\"0.3\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"2\" fill=\"#4fc3f7\" opacity=\"0.7\"/>\n        <circle cx=\"20\" cy=\"19\" r=\"1.5\" fill=\"#7c4dff\" opacity=\"0.6\"/>\n        <circle cx=\"35\" cy=\"22\" r=\"1.5\" fill=\"#7c4dff\" opacity=\"0.6\"/>\n        <circle cx=\"33\" cy=\"35\" r=\"1.5\" fill=\"#7c4dff\" opacity=\"0.6\"/>\n        <line x1=\"20\" y1=\"19\" x2=\"27\" y2=\"27\" stroke=\"#7c4dff\" stroke-width=\"0.7\" opacity=\"0.4\"/>\n        <line x1=\"35\" y1=\"22\" x2=\"27\" y2=\"27\" stroke=\"#7c4dff\" stroke-width=\"0.7\" opacity=\"0.4\"/>\n        <line x1=\"33\" y1=\"35\" x2=\"27\" y2=\"27\" stroke=\"#7c4dff\" stroke-width=\"0.7\" opacity=\"0.4\"/>\n      </svg>"
  },
  {
    "label": "CPU Chip",
    "category": "System",
    "tone": "amber",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg38\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a1200\"/><stop offset=\"100%\" stop-color=\"#0a0800\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg38)\"/>\n        <rect x=\"17\" y=\"17\" width=\"20\" height=\"20\" rx=\"3\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"1.3\"/>\n        <rect x=\"21\" y=\"21\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#ffb74d\" opacity=\"0.12\"/>\n        <line x1=\"21\" y1=\"12\" x2=\"21\" y2=\"17\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"12\" x2=\"27\" y2=\"17\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"33\" y1=\"12\" x2=\"33\" y2=\"17\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"21\" y1=\"37\" x2=\"21\" y2=\"42\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"27\" y1=\"37\" x2=\"27\" y2=\"42\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"33\" y1=\"37\" x2=\"33\" y2=\"42\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"12\" y1=\"21\" x2=\"17\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"12\" y1=\"27\" x2=\"17\" y2=\"27\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"12\" y1=\"33\" x2=\"17\" y2=\"33\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"37\" y1=\"21\" x2=\"42\" y2=\"21\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"37\" y1=\"27\" x2=\"42\" y2=\"27\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <line x1=\"37\" y1=\"33\" x2=\"42\" y2=\"33\" stroke=\"#ffb74d\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>\n        <rect x=\"23\" y=\"23\" width=\"8\" height=\"8\" rx=\"1.5\" fill=\"none\" stroke=\"#ffb74d\" stroke-width=\"0.8\" opacity=\"0.6\"/>\n      </svg>"
  },
  {
    "label": "Flame Mode",
    "category": "Media",
    "tone": "coral",
    "badge": "HOT",
    "badgeTone": "hot",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg39\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#1a0800\"/><stop offset=\"100%\" stop-color=\"#0a0400\"/></radialGradient>\n        <linearGradient id=\"flame\" x1=\"0\" y1=\"1\" x2=\"0\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#ff3d00\"/><stop offset=\"50%\" stop-color=\"#ff6d00\"/><stop offset=\"100%\" stop-color=\"#ffab40\"/></linearGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg39)\"/>\n        <path d=\"M27 42 C20 42 15 37 15 30 C15 25 17 22 20 19 C20 22 22 24 24 24 C22 20 25 14 30 10 C30 16 33 18 33 22 C35 20 35 17 35 15 C38 18 39 23 39 28 C39 35 34 42 27 42Z\" fill=\"url(#flame)\" opacity=\"0.9\"/>\n        <path d=\"M27 38 C23 38 21 35 21 31 C21 28 23 26 24 25 C24 27 25 28 26.5 28 C25 26 26 22 28 20 C28 23 30 24.5 31 26 C32 24 32 22 32 21 C34 23 35 27 35 30 C35 35 31 38 27 38Z\" fill=\"#ffcc02\" opacity=\"0.7\"/>\n      </svg>"
  },
  {
    "label": "Atom",
    "category": "System",
    "tone": "purple",
    "svg": "<svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"none\">\n        <defs><radialGradient id=\"bg40\" cx=\"50%\" cy=\"30%\" r=\"70%\"><stop offset=\"0%\" stop-color=\"#110822\"/><stop offset=\"100%\" stop-color=\"#080412\"/></radialGradient></defs>\n        <rect width=\"54\" height=\"54\" rx=\"14\" fill=\"url(#bg40)\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"15\" ry=\"6\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.2\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"15\" ry=\"6\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.2\" transform=\"rotate(60 27 27)\"/>\n        <ellipse cx=\"27\" cy=\"27\" rx=\"15\" ry=\"6\" fill=\"none\" stroke=\"#7c4dff\" stroke-width=\"1.2\" transform=\"rotate(120 27 27)\"/>\n        <circle cx=\"27\" cy=\"27\" r=\"3.5\" fill=\"#7c4dff\" opacity=\"0.9\"/>\n        <circle cx=\"42\" cy=\"27\" r=\"2\" fill=\"#ce93d8\" opacity=\"0.8\"/>\n        <circle cx=\"19.5\" cy=\"14.5\" r=\"2\" fill=\"#ce93d8\" opacity=\"0.8\"/>\n        <circle cx=\"19.5\" cy=\"39.5\" r=\"2\" fill=\"#ce93d8\" opacity=\"0.6\"/>\n      </svg>"
  }
] as const
