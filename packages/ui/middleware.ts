import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
    // signOut: "/auth/signout",
    // error: "/auth/error",
  },
});
