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
      clientId: "izgateway-config-console",
      clientSecret: "client-credentials-mock-client-secret",
      issuer: "http://192.168.0.159:8080/realms/myrealm",
    })
  ]
};
export default NextAuth(authOptions);
