/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    IZG_ENDPOINT_CRT_PATH: process.env.IZG_ENDPOINT_CRT_PATH,
    IZG_ENDPOINT_KEY_PATH: process.env.IZG_ENDPOINT_KEY_PATH,
    IZG_ENDPOINT_PASSCODE: process.env.IZG_ENDPOINT_PASSCODE,
    OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID,
    OKTA_ISSUER: process.env.OKTA_ISSUER,
    OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
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
