/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true
  },
  typedRoutes: false,
  outputFileTracingIncludes: {
    "/api/downloads/propertyflow": ["./storage/propertyflow/*.zip"],
    "/api/downloads/propertyflow/entitlement": ["./storage/propertyflow/*.zip"]
  }
}

export default nextConfig
