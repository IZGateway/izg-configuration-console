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
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.id_token = account.id_token
        token.provider = account.provider
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
