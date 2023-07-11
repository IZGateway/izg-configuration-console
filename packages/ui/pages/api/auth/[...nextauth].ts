import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'
export const authOptions = {
  debug: true,
  // Configure one or more authentication providers
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
      authorization: { params: { scope: 'openid email profile groups' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.id_token = account.id_token
        token.provider = account.provider
        token.accessToken = account.access_token
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
