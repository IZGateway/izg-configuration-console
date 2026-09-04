import 'next-auth/jwt'
import type { DefaultSession } from 'next-auth'
import type { CcRole } from './lib/security/rolemapping'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: DefaultSession['user'] & {
      id?: string
      /**
       * ALL recognized roles the user holds, ordered by ROLE_PRECEDENCE.
       *
       * There is deliberately no singular `role`. Permissions are a union across
       * these, so a single role cannot represent the user's authority; declaring
       * one would let a stale reader compile while silently applying single-role
       * logic. Read this through `subjectOf()` rather than directly.
       */
      roles: CcRole[]
      /** Member of OPERATIONS_GROUP. Separate from `roles` — see api-middleware-helper checkAdmin. */
      isAdmin: boolean
      /** Jurisdiction prefixes from the Okta userinfo claim, lowercased. */
      jurisdictions: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Okta group names, merged from profile, ID token, access token and userinfo. */
    groups?: string[]
    /** Jurisdiction prefixes from the Okta userinfo claim, lowercased. */
    jurisdictions?: string[]
    /** Opaque, CC-generated identifier for the login session (audit logging, IGDD-2223). */
    sessionId?: string
    /**
     * Okta ID-token `jti` claim captured at sign-in (token reference).
     * Stored as `oktaJti` (not `jti`) because next-auth reserves and overwrites
     * the standard `jti` claim with its own session-token id during encode.
     */
    oktaJti?: string
    /** Okta `auth_time` claim (Unix seconds) captured at sign-in, for Okta log correlation. */
    authTime?: number
  }
}
