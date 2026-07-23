import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode "N" badge isn't part of the design and overlaps the bottom nav's FAB.
  devIndicators: false,
};

export default nextConfig;
