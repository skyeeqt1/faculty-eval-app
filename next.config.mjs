/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Enable static export
  output: 'export',

  // 2. Disable image optimization (Next.js's default loader doesn't work with static exports)
  images: {
    unoptimized: true,
  },

  // 3. Optional: Ensure trailing slashes for better routing compatibility on Android
  trailingSlash: true,
};

export default nextConfig;