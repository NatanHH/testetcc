/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // permitir imagens externas usadas com next/image (ex: gravatar)
  images: {
    domains: ["www.gravatar.com"],
    // se precisar de padrões mais flexíveis, use remotePatterns
    // remotePatterns: [ { protocol: 'https', hostname: 'www.gravatar.com', pathname: '/**' } ]
  },
  // Enable production source maps so Vercel / browser stacks map to original files
  // This helps track down minified React errors in production (safe to enable).
  productionBrowserSourceMaps: true,
  // se quiser gerar build standalone (opcional)
  // output: "standalone",
};
module.exports = nextConfig;
