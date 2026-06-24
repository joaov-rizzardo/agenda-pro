import type { AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google, { type GoogleProfile } from "next-auth/providers/google";

import authConfig from "@/auth.config";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : null;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : null;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValidPassword = await verifyPassword(
          password,
          user.passwordHash
        );
        if (!isValidPassword) return null;

        if (!user.emailVerified) return null;

        return user;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          firstName: profile.given_name,
          lastName: profile.family_name ?? "",
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return (profile as GoogleProfile | undefined)?.email_verified === true;
      }
      return true;
    },
    async jwt({ token, trigger, user, session }) {
      if (trigger === "signIn" || trigger === "signUp") {
        const memberships = await prisma.workspaceMembership.findMany({
          where: { userId: user.id },
          select: { workspaceId: true },
          take: 2,
        });
        token.activeWorkspaceId =
          memberships.length === 1 ? memberships[0].workspaceId : undefined;
      } else if (trigger === "update") {
        token.activeWorkspaceId = session?.user?.activeWorkspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.user.activeWorkspaceId = token.activeWorkspaceId ?? null;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      const adapterUser = user as AdapterUser;
      if (
        account?.provider !== "google" ||
        !adapterUser.id ||
        adapterUser.emailVerified
      ) {
        return;
      }
      if ((profile as GoogleProfile | undefined)?.email_verified === true) {
        await prisma.user.update({
          where: { id: adapterUser.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});
