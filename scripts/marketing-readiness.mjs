import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const siteUrl = "https://volynx.world";

const acquisitionRoutes = [
  "/",
  "/platform/",
  "/signal-drop/",
  "/tiktok/",
  "/volynx-launch/",
  "/volynx-lab/",
  "/volynx-lab/converter/",
  "/volynx-lab/image-scaler/",
  "/volynx-lab/image-suite/",
  "/qrgen/",
  "/dev-journey/",
  "/products/",
  "/pricing/",
  "/services/",
  "/landing/",
  "/about/",
  "/contact/",
];

const privateRoutes = [
  "/account/",
  "/checkout/",
  "/delivery/",
  "/login/",
  "/signup/",
  "/profile/",
  "/recarregar/",
];

const toOutputFile = (route) =>
  resolve("dist", route === "/" ? "index.html" : `${route.slice(1)}index.html`);

const matches = (html, expression) => expression.test(html);

const requiredMetadata = (route, html) => [
  ["title", matches(html, /<title>[^<\n]+<\/title>/i)],
  ["description", matches(html, /<meta\b[^>]*\bname="description"[^>]*\bcontent="[^"]+/i)],
  ["canonical", matches(html, new RegExp(`<link\\s+rel="canonical"\\s+href="${siteUrl}${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"))],
  ["Open Graph title", matches(html, /<meta\s+property="og:title"\s+content="[^"]+/i)],
  ["Open Graph image", matches(html, new RegExp(`<meta\\s+property="og:image"\\s+content="${siteUrl}/`, "i"))],
  ["Twitter card", matches(html, /<meta\s+name="twitter:card"\s+content="summary_large_image"/i)],
].filter(([, passed]) => !passed).map(([name]) => name);

const failures = [];
const sitemap = await readFile(resolve("public/sitemap.xml"), "utf8");

for (const route of acquisitionRoutes) {
  const file = toOutputFile(route);
  try {
    await access(file, constants.R_OK);
    const html = await readFile(file, "utf8");
    const missing = requiredMetadata(route, html);
    if (missing.length) failures.push({ route, issue: `missing ${missing.join(", ")}` });
    if (!sitemap.includes(`${siteUrl}${route}`)) {
      failures.push({ route, issue: "missing from sitemap" });
    }
  } catch {
    failures.push({ route, issue: "missing generated HTML" });
  }
}

for (const route of privateRoutes) {
  const file = toOutputFile(route);
  try {
    await access(file, constants.R_OK);
    const html = await readFile(file, "utf8");
    if (!matches(html, /<meta\s+name="robots"\s+content="noindex, nofollow"/i)) {
      failures.push({ route, issue: "must be noindex" });
    }
    if (sitemap.includes(`${siteUrl}${route}`)) {
      failures.push({ route, issue: "must not appear in sitemap" });
    }
  } catch {
    failures.push({ route, issue: "missing generated HTML" });
  }
}

if (failures.length) {
  console.error("Marketing readiness check failed:");
  for (const failure of failures) console.error(`- ${failure.route}: ${failure.issue}`);
  process.exitCode = 1;
} else {
  console.log(`Marketing readiness passed: ${acquisitionRoutes.length} acquisition routes and ${privateRoutes.length} private routes checked.`);
}
