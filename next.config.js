/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    OPERATIONS_GROUP: 'IZG Operations',
    USER_GROUP: 'IZG User',
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
}
