/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    IZG_ENDPOINT_CRT_PATH: process.env.IZG_ENDPOINT_CRT_PATH,
    IZG_ENDPOINT_KEY_PATH: process.env.IZG_ENDPOINT_KEY_PATH,
    IZG_ENDPOINT_PASSCODE: process.env.IZG_ENDPOINT_PASSCODE,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/manage",
        permanent: true,
      },
    ];
  },
};
