import 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's postal address. */
      address: string
    } & DefaultSession['user']
    isAdmin: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
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
