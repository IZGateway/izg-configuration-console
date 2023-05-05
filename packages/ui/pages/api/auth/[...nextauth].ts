import NextAuth, { Session, User } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
export const authOptions = {
  debug: true,
  // Configure one or more authentication providers
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: "client-credentials-mock-client-secret",
      issuer: process.env.KEYCLOAK_ISSUER,
      idToken: true,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.id_token = account.id_token;
        token.provider = account.provider;
      }
      return token;
    },
  },
};
export default NextAuth(authOptions);
