import path from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/api/downloads/propertyflow": ["./storage/propertyflow/*.zip"],
    "/api/downloads/propertyflow/entitlement": ["./storage/propertyflow/*.zip"]
  },
  images: {
    unoptimized: true
  }
}

export default nextConfig
