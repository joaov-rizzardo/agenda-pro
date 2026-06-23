import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    firstName: string;
    lastName: string;
  }

  interface Session {
    user: {
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }
}
