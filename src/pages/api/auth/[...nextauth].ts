/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'
import { randomUUID } from 'crypto'
import logger from '../../../../logger'
import _ from 'lodash'
import roles from '../../../lib/security/roles'

const userInfoEndpoint = `${process.env.NEXT_PUBLIC_OKTA_ISSUER}/oauth2/v1/userinfo`
const isDebugging = process.env.NEXTAUTH_DEBUG === 'true'
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
        session.user.role = _.intersection(token.groups, roles)[0]
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
        token.sub = account.providerAccountId
        token.id = profile.id
        token.groups = profile.groups

        // Generate an opaque, CC-owned session identifier (stable for the life
        // of this login session) and capture the Okta login timestamp. These
        // back the audit-log user identity (IGDD-2223). Decoding is best-effort:
        // a failure here must never break sign-in.
        token.sessionId = randomUUID()
        try {
          const idTokenJwt = account.id_token
          if (idTokenJwt) {
            const payload = JSON.parse(
              Buffer.from(idTokenJwt.split('.')[1], 'base64url').toString('utf8')
            )
            token.authTime = payload.auth_time
          }
        } catch (error) {
          logger.warn('Failed to decode id_token for auth_time', {
            errorMessage: error instanceof Error ? error.message : String(error),
          })
        }

        try {
          const response = await fetch(userInfoEndpoint, {
            headers: {
              Authorization: 'Bearer ' + account.access_token,
            },
          })
          if (!response.ok) {
            logger.error('Failed to fetch user info from Okta', {
              statusCode: response.status,
              statusText: response.statusText,
              endpoint: userInfoEndpoint,
              userId: profile.id,
              operation: 'jwt_callback',
            })
            token.jurisdictions = []
          } else {
            const data = await response.json()
            token.jurisdictions = data?.jurisdictions?.map((j) =>
              j.toLowerCase()
            )
          }
        } catch (error) {
          logger.error('Error fetching user info from Okta', {
            endpoint: userInfoEndpoint,
            userId: profile.id,
            operation: 'jwt_callback',
            errorMessage: error.message,
            errorType: error.name,
            stack: error.stack,
          })
          token.jurisdictions = []
        }
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
