/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    OPERATIONS_GROUP: `${process.env.OPERATIONS_GROUP}`,
    USER_GROUP: `${process.env.USER_GROUP}`,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/manage',
        permanent: true,
      },
    ]
  },
  webpack(config, { nextRuntime }) {
    // as of Next.js latest versions, the nextRuntime is preferred over `isServer`, because of edge-runtime
    if (typeof nextRuntime === 'undefined') {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
}
