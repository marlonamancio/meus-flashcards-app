import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode "N" badge isn't part of the design and overlaps the bottom nav's FAB.
  devIndicators: false,
  experimental: {
    serverActions: {
      // Above the 20 MB documented in CLAUDE.md ("Limites de arquivo") to leave headroom for
      // multipart/form-data overhead — Next.js's default Server Action body limit is 1 MB.
      bodySizeLimit: '25mb',
    },
  },
  // pdf-parse (via pdfjs-dist) and its native @napi-rs/canvas dependency rely on relative
  // filesystem paths and native bindings that don't survive being rewritten into .next/server
  // chunks — keeping them external preserves their real node_modules layout. See
  // lib/extraction/pdf.ts for the companion fix (embedding the pdf.js worker instead of
  // resolving it by path, belt-and-suspenders against the same class of bug).
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
};

export default nextConfig;
