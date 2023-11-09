/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    OPERATIONS_GROUP: 'IZG Operations',
    USER_GROUP: 'IZG User',
    GA_ID: 'G-SE3E339T7E',
    OKTA_ISSUER: process.env.OKTA_ISSUER,
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
