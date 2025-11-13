import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ OTIMIZAÇÃO: Habilita compressão gzip/brotli (reduz payload em ~60-70%)
  compress: true,

  // ✅ OTIMIZAÇÃO: Configuração de imagens otimizada
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // ✅ OTIMIZAÇÃO: Habilita SWC minification (mais rápido que Terser)
  swcMinify: true,

  // ✅ OTIMIZAÇÃO: Remove console.log em produção
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default nextConfig;
