import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous({
      profile: (params) => ({
        name: (params.name as string) || "Anonymous",
        isAnonymous: true,
      }),
    }),
  ],
});
