/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from 'next-auth'
import OktaProvider from 'next-auth/providers/okta'
import { randomUUID } from 'crypto'
import logger from '../../../../logger'
import {
  getGroupsFromClaims,
  getGroupsFromJwt,
  mergeGroups,
  rolesFromGroups,
} from '../../../lib/security/rolemapping'

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
        // ALL held roles, not the first match. Recomputed from token.groups on
        // every call, so a JWT issued before this change still resolves
        // correctly and no in-flight session needs migrating.
        //
        // `session.user.role` (singular) is deliberately NOT set. Nothing
        // displays it and the audit context does not capture it, so keeping it
        // would only preserve a footgun: any reader still using it would compile
        // and silently apply single-role logic.
        session.user.roles = rolesFromGroups(token.groups)
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

        // Generate an opaque, CC-owned session identifier (stable for the life
        // of this login session) and capture the Okta login timestamp + token
        // id for the audit-log identity (IGDD-2223). Decoding is best-effort:
        // a failure here must never break sign-in.
        token.sessionId = randomUUID()
        try {
          const idTokenJwt = account.id_token
          if (idTokenJwt) {
            const payload = JSON.parse(
              Buffer.from(idTokenJwt.split('.')[1], 'base64url').toString('utf8')
            )
            token.authTime = payload.auth_time
            token.oktaJti = payload.jti
          }
        } catch (error) {
          logger.warn('Failed to decode id_token for audit fields', {
            errorMessage: error instanceof Error ? error.message : String(error),
          })
        }

        // Fetch userinfo before resolving roles: it supplies `jurisdictions`
        // (tenancy) and is also one of the four group sources merged below.
        let userInfo: unknown = {}
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
            userInfo = await response.json()
            const data = userInfo as { jurisdictions?: string[] }
            // Default to [] (not undefined) when Okta's userinfo response omits
            // the claim, so a jurisdiction-scoped role with no jurisdictions set
            // fails closed (empty reach) instead of crashing downstream `.join`/
            // `.map` calls that assume an array (e.g. fetchEndpointStatus.ts).
            token.jurisdictions =
              data?.jurisdictions?.map((j) => j.toLowerCase()) ?? []
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

        // Okta can be configured to place the groups claim in any of these, and
        // which one it lands in is tenant configuration CC does not control.
        // Reading only `profile.groups` made a restrictive ID-token groups-claim
        // filter a single point of failure whose symptom — no role — is
        // indistinguishable from the group not existing. Union of all four, so a
        // group present in any one of them counts. Never subtractive.
        token.groups = mergeGroups(
          getGroupsFromClaims(profile),
          getGroupsFromJwt(account.id_token),
          getGroupsFromJwt(account.access_token),
          getGroupsFromClaims(userInfo)
        )

        // Emit a once-per-login authorization snapshot. Okta group membership
        // is mutable, so this captures point-in-time authorization tied to the
        // sessionId; ordinary log lines carry sessionUser but not groups (IGDD-2223).
        // Logs the FULL role set: with a union model, recording one role would
        // make "which role authorized this action?" unanswerable afterwards.
        logger.info('Session established', {
          sessionUser: {
            name: profile.name ?? token.name,
            userId: token.sub,
            email: profile.email ?? token.email,
            sessionId: token.sessionId,
            jti: token.oktaJti,
            authTime: token.authTime,
          },
          groups: token.groups,
          roles: rolesFromGroups(token.groups),
        })
      }
      return token
    },
  },
}
export default NextAuth(authOptions)
