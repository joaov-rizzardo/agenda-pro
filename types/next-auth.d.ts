import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    firstName: string;
    lastName: string;
  }

  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      activeWorkspaceId: string | null;
    } & DefaultSession["user"];
  }
}

// `next-auth/jwt` re-exports this interface via `export *`, which doesn't
// support declaration merging — augment the original module instead.
declare module "@auth/core/jwt" {
  interface JWT {
    activeWorkspaceId?: string | null;
  }
}
