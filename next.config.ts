import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode "N" badge isn't part of the design and overlaps the bottom nav's FAB.
  devIndicators: false,
  turbopack: {
    // Pins the workspace root explicitly instead of relying on Turbopack's lockfile-based
    // inference, which started misfiring after the Next 16.3.0 upgrade ("Next.js inferred your
    // workspace root, but it may not be correct... couldn't find next/package.json from
    // .../app"). There's no stray lockfile/package.json anywhere under this project or in any
    // ancestor directory (verified) — this is a single-package repo, not a monorepo — so the
    // fix is the maintainer-recommended one from
    // https://github.com/vercel/next.js/discussions/78192#discussioncomment-12940455: remove the
    // ambiguity by declaring the root instead of depending on auto-detection.
    root: path.join(__dirname),
  },
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
