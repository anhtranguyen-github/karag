

import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  async rewrites() {
    const destination =
      process.env.PLATFORM_API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';

    return [
      {
        source: '/proxy/:path*',
        destination: `${destination}/:path*`,
      },
    ];
  },
  webpack: (config) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;
