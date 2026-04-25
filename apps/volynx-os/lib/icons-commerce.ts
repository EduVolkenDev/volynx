import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import type Stripe from "stripe"
import { iconPacks, type IconPack } from "@/content/icon-packs"
import { getStripe } from "@/lib/stripe"
import type { ZipFileEntry } from "@/lib/zip-stream"

export type IconDeliveryPack = {
  slug: string
  name: string
  folder: string
  plan: "free" | "premium"
  category: string
  count: number
  price: string
  priceAmount: number
  priceCurrency: "gbp"
  priceDetail: string
  preview: string[]
  sourceRoot: "assets" | "packs"
  aliases: string[]
}

export type VerifiedIconPackPurchase = {
  sessionId: string
  pack: IconDeliveryPack
  customerEmail: string | null
  amountTotal: number | null
  currency: string | null
  bytes: number
  files: number
}

const publicDir = path.join(process.cwd(), "public")
const assetsIconDir = path.join(publicDir, "assets", "icons-store")
const packIconDir = path.join(publicDir, "icons-store", "packs")

const extraDeliveryPacks: Omit<IconDeliveryPack, "priceCurrency" | "aliases">[] = [
  packEntry("chromed-premium", "Chromed Premium", "chromed-premium", "premium", "Metal", 77, "£29", "77-piece chrome system", "packs"),
  packEntry("daily3Dpremium", "Daily 3D Premium", "daily3Dpremium", "premium", "Daily OS", 40, "£19", "40 3D daily icons", "packs"),
  packEntry("daily-iridescent-premium", "Daily Iridescent Premium", "daily-iridescent-premium", "premium", "Daily OS", 33, "£15", "33 iridescent icons", "packs"),
  packEntry("daily-poligon-premium", "Daily Polygon Premium", "daily-poligon-premium", "premium", "Daily OS", 35, "£15", "35 polygon icons", "packs", ["daily-polygon-premium"]),
  packEntry("darkglass-premium", "Dark Glass Premium", "darkglass-premium", "premium", "Glass", 19, "£9", "19 glass icons", "packs", ["dark-glass-premium"]),
  packEntry("icons-metal-premium", "Metal Premium", "icons-metal-premium", "premium", "Metal", 20, "£12", "20 metal icons", "packs"),
  packEntry("icons-neon-premium", "Neon Premium", "icons-neon-premium", "premium", "Neon", 24, "£12", "24 neon icons", "packs"),
  packEntry("metal-blue-premium2", "Metal Blue Premium", "metal-blue-premium2", "premium", "Metal", 16, "£9", "16 blue metal icons", "packs", ["metal-blue-premium"]),
  packEntry("moderncards-premium", "Modern Cards Premium", "moderncards-premium", "premium", "Cards", 28, "£15", "28 card-style icons", "packs", ["modern-cards-premium"]),
  packEntry("super-icons-premium", "Super Icons Premium", "super-icons-premium", "premium", "Core", 14, "£9", "14 hero icons", "packs"),
  packEntry("glass-icons-premium", "Glass Icons Premium", "Icons-Glass-Premium", "premium", "Glass", 41, "£19", "41 translucent icons", "assets", ["icons-glass-premium"]),
  packEntry("metal-premium-complete", "Metal Premium Complete", "Metal-Premium", "premium", "Metal", 44, "£24", "44 high-shine icons", "assets", ["metal-premium"]),
  packEntry("polygon-premium-complete", "Polygon Premium Complete", "Poligon-Premium", "premium", "Daily OS", 111, "£39", "111-piece flagship set", "assets", ["poligon-premium", "polygon-premium"]),
  packEntry("volynx-master-webp-premium", "Volynx Master WebP Vault", "volynx-master-webp", "premium", "Master Vault", 828, "£149", "828 final WebP icons", "assets", ["volynx-master-webp", "volynx-master-vault"])
]

export const iconDeliveryPacks = buildDeliveryPacks()

export function isIconPackSlug(value: unknown): value is string {
  return typeof value === "string" && iconDeliveryPacks.some((pack) => matchesPack(pack, value))
}

export function getIconPack(slug: string) {
  const pack = findIconPack(slug)

  if (!pack) {
    throw new Error("Invalid icon pack.")
  }

  return pack
}

export function getCheckoutIconPacks() {
  return iconDeliveryPacks.filter((pack) => pack.plan === "premium")
}

export function getIconPackSourceDir(pack: IconDeliveryPack) {
  const root = pack.sourceRoot === "assets" ? assetsIconDir : packIconDir
  const sourceDir = path.join(root, pack.folder)

  if (!existsSync(sourceDir)) {
    throw new Error(`Icon pack source folder is missing: ${pack.folder}`)
  }

  return sourceDir
}

export function getIconPackZipEntries(pack: IconDeliveryPack): ZipFileEntry[] {
  const sourceDir = getIconPackSourceDir(pack)

  return collectFiles(sourceDir).map((file) => ({
    filePath: file.filePath,
    name: `${pack.slug}/${file.relativePath}`,
    mtime: file.mtime
  }))
}

export function getIconPackMeta(pack: IconDeliveryPack) {
  const entries = getIconPackZipEntries(pack)
  const bytes = entries.reduce((total, entry) => total + statSync(entry.filePath).size, 0)

  return {
    filename: `${pack.slug}.zip`,
    files: entries.length,
    bytes
  }
}

export async function verifyIconPackSession(
  sessionId: string,
  requestedPackSlug?: string | null
): Promise<VerifiedIconPackPurchase> {
  if (!sessionId.startsWith("cs_")) {
    throw new Error("Invalid Stripe Checkout session ID")
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.mode !== "payment" || session.payment_status !== "paid" || session.status !== "complete") {
    throw new Error("Stripe session is not paid and complete")
  }

  if (process.env.NODE_ENV === "production" && !session.livemode) {
    throw new Error("Test Stripe sessions cannot unlock production delivery")
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"]
  })
  const pack = resolvePurchasedIconPack(session, lineItems.data, requestedPackSlug)

  validateOwnCheckoutAmount(session, pack)

  const meta = getIconPackMeta(pack)

  return {
    sessionId: session.id,
    pack,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    bytes: meta.bytes,
    files: meta.files
  }
}

export function previewIconDownloadsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ICON_PACK_ENABLE_PREVIEW_DOWNLOADS === "true"
}

function buildDeliveryPacks() {
  const fromShelf = iconPacks.map((pack) => fromIconPack(pack))
  const merged = new Map<string, IconDeliveryPack>()

  for (const pack of [...fromShelf, ...extraDeliveryPacks.map(finalizeExtraPack)]) {
    const existing = merged.get(pack.slug)

    if (!existing) {
      merged.set(pack.slug, pack)
      continue
    }

    merged.set(pack.slug, {
      ...existing,
      aliases: Array.from(new Set([...existing.aliases, ...pack.aliases]))
    })
  }

  return Array.from(merged.values()).filter((pack) => existsSync(getSourceDirUnchecked(pack)))
}

function fromIconPack(pack: IconPack): IconDeliveryPack {
  return {
    slug: pack.slug,
    name: pack.name,
    folder: pack.folder,
    plan: pack.plan,
    category: pack.category,
    count: pack.count,
    price: pack.price,
    priceAmount: parsePriceAmount(pack.price),
    priceCurrency: "gbp",
    priceDetail: pack.priceDetail,
    preview: pack.preview,
    sourceRoot: "assets",
    aliases: []
  }
}

function packEntry(
  slug: string,
  name: string,
  folder: string,
  plan: "free" | "premium",
  category: string,
  count: number,
  price: string,
  priceDetail: string,
  sourceRoot: "assets" | "packs",
  aliases: string[] = []
) {
  return {
    slug,
    name,
    folder,
    plan,
    category,
    count,
    price,
    priceAmount: parsePriceAmount(price),
    priceDetail,
    preview: [],
    sourceRoot,
    aliases
  }
}

function finalizeExtraPack(pack: Omit<IconDeliveryPack, "priceCurrency" | "aliases"> & { aliases?: string[] }): IconDeliveryPack {
  return {
    ...pack,
    priceCurrency: "gbp",
    aliases: pack.aliases ?? []
  }
}

function parsePriceAmount(price: string) {
  if (price.toLowerCase() === "free") {
    return 0
  }

  const amount = Number(price.replace(/[^0-9.]/g, ""))

  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

function getSourceDirUnchecked(pack: IconDeliveryPack) {
  const root = pack.sourceRoot === "assets" ? assetsIconDir : packIconDir
  return path.join(root, pack.folder)
}

function collectFiles(dir: string, prefix = ""): Array<{ filePath: string; relativePath: string; mtime: Date }> {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: Array<{ filePath: string; relativePath: string; mtime: Date }> = []

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue
    }

    const filePath = path.join(dir, entry.name)
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      files.push(...collectFiles(filePath, relativePath))
      continue
    }

    if (entry.isFile()) {
      files.push({ filePath, relativePath, mtime: statSync(filePath).mtime })
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

function resolvePurchasedIconPack(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
  requestedPackSlug?: string | null
) {
  const explicitValues = metadataValues(session.metadata)

  for (const item of lineItems) {
    explicitValues.push(...metadataValues(item.price?.metadata))

    const product = item.price?.product

    if (product && typeof product !== "string" && isActiveProduct(product)) {
      explicitValues.push(...metadataValues(product.metadata))
    }
  }

  for (const value of explicitValues) {
    const pack = findIconPack(value)

    if (pack) {
      assertRequestedPack(pack, requestedPackSlug)
      return pack
    }
  }

  const descriptiveValues = [
    session.client_reference_id,
    session.metadata?.product,
    ...lineItems.flatMap((item) => {
      const product = item.price?.product
      const productValues = product && typeof product !== "string" && isActiveProduct(product)
        ? [product.name, product.description]
        : []

      return [item.description, item.price?.nickname, ...productValues]
    })
  ].filter(Boolean) as string[]

  for (const value of descriptiveValues) {
    const pack = findIconPack(value)

    if (pack) {
      assertRequestedPack(pack, requestedPackSlug)
      return pack
    }
  }

  throw new Error("Stripe session does not contain a recognized icon pack")
}

function metadataValues(metadata: Stripe.Metadata | null | undefined) {
  if (!metadata) {
    return []
  }

  return [
    metadata.pack,
    metadata.packSlug,
    metadata.iconPack,
    metadata.slug,
    metadata.product,
    metadata.productSlug
  ].filter(Boolean) as string[]
}

function isActiveProduct(product: Stripe.Product | Stripe.DeletedProduct): product is Stripe.Product {
  return !("deleted" in product && product.deleted)
}

function validateOwnCheckoutAmount(session: Stripe.Checkout.Session, pack: IconDeliveryPack) {
  const product = session.metadata?.product

  if (product !== "icons-store" && product !== "icon-pack" && product !== "volynx-icons-store") {
    return
  }

  const catalogAmount = session.amount_subtotal ?? session.amount_total

  if (pack.priceAmount > 0 && (catalogAmount !== pack.priceAmount || session.currency !== pack.priceCurrency)) {
    throw new Error("Stripe session amount does not match the icon pack price")
  }
}

function assertRequestedPack(pack: IconDeliveryPack, requestedPackSlug?: string | null) {
  if (!requestedPackSlug) {
    return
  }

  if (!matchesPack(pack, requestedPackSlug)) {
    throw new Error("Stripe session is for a different icon pack")
  }
}

function findIconPack(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return iconDeliveryPacks.find((pack) => matchesPack(pack, value)) ?? null
}

function matchesPack(pack: IconDeliveryPack, value: string) {
  const normalizedValue = normalize(value)
  const identifiers = [pack.slug, pack.name, pack.folder, ...pack.aliases].map(normalize)

  return identifiers.some((identifier) => (
    normalizedValue === identifier ||
    normalizedValue.includes(identifier) ||
    (normalizedValue.length >= 8 && identifier.includes(normalizedValue))
  ))
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}
