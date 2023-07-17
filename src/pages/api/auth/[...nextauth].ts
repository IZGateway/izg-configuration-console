import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'

const userInfoEndpoint = `${process.env.OKTA_ISSUER}/oauth2/v1/userinfo`
const isDebugging =
  (`${process.env.NEXTAUTH_DEBUG}` as unknown as boolean) || false
export const authOptions = {
  debug: isDebugging,
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
      authorization: { params: { scope: 'openid email profile groups' } },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (token) {
        session.id = token.id
        session.groups = token.groups
        session.isAdmin = token?.groups?.includes(process.env.OPERATIONS_GROUP)
        session.jurisdictions = token.jurisdictions
      }
      return session
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      if (account) {
        token.id_token = account.id_token
        token.provider = account.provider
        token.accessToken = account.access_token
        token.groups = profile.groups
        try {
          const response = await fetch(userInfoEndpoint, {
            headers: {
              Authorization: 'Bearer ' + account.access_token,
            },
          })
          const data = await response.json()
          token.jurisdictions = data?.jurisdictions
        } catch (err) {
          console.error('ERROR FETCHING USER INFO FROM OKTA: ' + err)
        }
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
