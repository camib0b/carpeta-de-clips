/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

// CLIPPED_XML remote bindings are only needed while running `next dev`.
// `next build` / OpenNext must not start a wrangler remote proxy (that requires login).
if (process.argv.includes('dev')) {
  import('@opennextjs/cloudflare').then((m) =>
    m.initOpenNextCloudflareForDev({
      experimental: { remoteBindings: true },
    }),
  )
}
