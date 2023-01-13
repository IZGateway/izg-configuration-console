import NextAuth, { Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { identityProvider } from "../../../lib/identityProvider";
import { serviceProvider } from "../../../lib/serviceProvider";
export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      id: "saml",
      name: "SAML",
      authorize: async ({ samlBody }) => {
        samlBody = JSON.parse(decodeURIComponent(samlBody));

        const postAssert = (identityProvider: any, samlBody: string) =>
          new Promise((resolve: any, reject: any) => {
            serviceProvider.post_assert(
              identityProvider,
              {
                request_body: samlBody,
              },
              (error: any, response: any) => {
                if (error) {
                  reject(error as any);
                }

                resolve(response as any);
              }
            );
          });

        try {
          const { user }: any = await postAssert(identityProvider, samlBody);
          return user;
        } catch (error) {
          console.error(error);
          return null;
        }
      },
      credentials: undefined,
    }),
  ],
  secret: "a6CR8U+5027MbWfSNKn3Tx20o2u2RLgUxsrokp5DJ3U=",
  pages: {
    signIn: "/login",
  },
  debug: true,
  callbacks: {
    jwt: (token, user?) => {
      if (user) {
        return user;
      }
      return token;
    },
    session: ({ session, user }) => {
      return {
        ...session,
        user,
      };
    },
  },
};
export default NextAuth(authOptions);
