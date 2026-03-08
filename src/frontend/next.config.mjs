/** @type {import("next").NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  async rewrites() {
    const destination =
      process.env.PLATFORM_API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";

    return [
      {
        source: "/proxy/:path*",
        destination: `${destination}/:path*`
      }
    ];
  }
};

export default nextConfig;
