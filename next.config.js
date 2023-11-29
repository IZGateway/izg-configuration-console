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
}
