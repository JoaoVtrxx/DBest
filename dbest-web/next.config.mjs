/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a fully static site (out/) so it can be served by any web server —
  // including being bundled inside the Spring Boot jar for a single-artifact run.
  output: "export",
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
