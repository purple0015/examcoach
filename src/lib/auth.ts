import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { Locale } from "@/types";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      try {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      } catch (error) {
        console.error("Authorize error:", error);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", newUser: "/dashboard" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      if (user || trigger === "update" || !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, locale: true, email: true },
          });
          if (dbUser) {
            const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
            const shouldBeAdmin = !!adminEmail && dbUser.email.toLowerCase() === adminEmail;

            if (shouldBeAdmin && dbUser.role !== "admin") {
              await prisma.user.update({ where: { id: token.sub }, data: { role: "admin" } });
            }
            token.role = shouldBeAdmin ? "admin" : dbUser.role;
            token.locale = isLocale(dbUser.locale) ? dbUser.locale : DEFAULT_LOCALE;
          }
        } catch (error) {
          console.error("JWT callback error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          session.user.role = (token.role as string) ?? "user";
          session.user.locale = (token.locale as Locale) ?? DEFAULT_LOCALE;
        }
      } catch (error) {
        console.error("Session callback error:", error);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      try {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        await prisma.subscription.create({
          data: {
            userId: user.id,
            tier: "free_trial",
            status: "active",
            trialStartDate: new Date(),
            trialEndDate,
            maxSeats: 1,
          },
        });
        await prisma.studyGoal.create({
          data: { userId: user.id, dailyMinutes: 20, weeklyTopics: 5 },
        });
      } catch (error) {
        console.error("createUser event error:", error);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
