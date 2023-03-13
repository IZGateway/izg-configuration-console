import NextAuth, { Session, User } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
export const authOptions = {
  debug: true,
  // Configure one or more authentication providers
  providers: [
    KeycloakProvider({
      // clientId: process.env.KEYCLOAK_ID,
      // clientSecret: process.env.KEYCLOAK_SECRET,
      // issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: "client-credentials-mock-client-secret",
      issuer: process.env.KEYCLOAK_ISSUER,
    })
  ]
};
export default NextAuth(authOptions);
