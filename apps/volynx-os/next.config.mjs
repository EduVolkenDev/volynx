/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    typedRoutes: false,
    outputFileTracingIncludes: {
      "/api/downloads/propertyflow": ["./storage/propertyflow/*.zip"],
      "/api/downloads/propertyflow/entitlement": ["./storage/propertyflow/*.zip"]
    }
  }
}

export default nextConfig
