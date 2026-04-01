import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "y3l8rbm69ww9fiju.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
