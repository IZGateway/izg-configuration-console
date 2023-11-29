/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'
import logger from '../../../../logger'
import _ from 'lodash'

const userInfoEndpoint = `${process.env.NEXT_PUBLIC_OKTA_ISSUER}/oauth2/v1/userinfo`
const isDebugging =
  (`${process.env.NEXTAUTH_DEBUG}` as unknown as boolean) || false
export const authOptions = {
  debug: isDebugging,
  providers: [
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.NEXT_PUBLIC_OKTA_ISSUER,
      idToken: true,
      authorization: { params: { scope: 'openid email profile groups' } },
    }),
  ],
  session: {
    maxAge: 30 * 60, // 30 mins
    jwt: true,
  },
  callbacks: {
    async session({ session, token, user }) {
      if (token) {
        session.user.id = token.id
        session.accessToken = token.accessToken
        session.user.groups = token.groups
        session.user.isAdmin = token?.groups?.includes(
          process.env.OPERATIONS_GROUP
        )
        session.user.jurisdictions = token.jurisdictions
      }
      return session
    },
    async jwt({ token, user, account, profile, isNewUser, idToken }) {
      if (account) {
        token.idToken = idToken
        token.id_token = account.id_token
        token.provider = account.provider
        token.accessToken = account.access_token
        token.id = profile.id
        token.groups = profile.groups
        try {
          const response = await fetch(userInfoEndpoint, {
            headers: {
              Authorization: 'Bearer ' + account.access_token,
            },
          })
          const data = await response.json()
          token.jurisdictions = data?.jurisdictions?.map((j) => _.lowerCase(j))
        } catch (err) {
          logger.error('ERROR FETCHING USER INFO FROM OKTA: ' + err)
        }
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
