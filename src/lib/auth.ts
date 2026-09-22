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
    name: "Credentials",
    credentials: {
      identifier: { label: "Email or ID", type: "text" },
      password: { label: "Password", type: "password" },
      type: { label: "Type", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.identifier || !credentials?.password) return null;

      try {
        let user;
        if (credentials.type === "id") {
          user = await prisma.user.findUnique({
            where: { orgIdCode: credentials.identifier.toUpperCase() },
          });
        } else {
          user = await prisma.user.findUnique({
            where: { email: credentials.identifier.toLowerCase() },
          });
        }

        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        if (user.orgIdCode) {
          const orgIdRecord = await prisma.orgID.findUnique({
            where: { code: user.orgIdCode },
          });

          if (orgIdRecord && orgIdRecord.status === "trial") {
            const now = new Date();
            if (orgIdRecord.trialEndsAt && now > orgIdRecord.trialEndsAt) {
              throw new Error("TRIAL_EXPIRED");
            }
          }
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      } catch (error: any) {
        if (error.message === "TRIAL_EXPIRED") throw error;
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

const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith("https://") === true || process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

// `trustHost` is required when Render terminates TLS and forwards the request to Next.js.
// The explicit cookies keep the OAuth state cookie on HTTPS while remaining compatible
// with local HTTP development.
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", newUser: "/dashboard" },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: useSecureCookies },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { sameSite: "lax" as const, path: "/", secure: useSecureCookies },
    },
    csrfToken: {
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: useSecureCookies },
    },
    state: {
      name: `${cookiePrefix}next-auth.state-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }: any) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      // Always validate the subject. A JWT can outlive its database user (for
      // example after a database reset), and trusting a stale token lets routes
      // attempt child-record inserts with a nonexistent foreign key.
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            locale: true,
            email: true,
            orgId: true,
            orgIdCode: true,
            organization: { select: { colors: true } },
          },
        });

        if (!dbUser) {
          // Removing sub makes the session callback return an unauthenticated
          // session, so the client can sign in again instead of receiving P2003.
          delete token.sub;
          delete token.role;
          delete token.locale;
          delete token.orgId;
          delete token.orgIdCode;
          delete token.orgColors;
          delete token.orgStatus;
          delete token.trialEndsAt;
          return token;
        }

        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const shouldBeAdmin = !!adminEmail && dbUser.email.toLowerCase() === adminEmail;

        if (shouldBeAdmin && dbUser.role !== "admin") {
          await prisma.user.update({ where: { id: token.sub }, data: { role: "admin" } });
        }
        token.role = shouldBeAdmin ? "admin" : dbUser.role;
        token.locale = isLocale(dbUser.locale) ? dbUser.locale : DEFAULT_LOCALE;
        token.orgId = dbUser.orgId;
        token.orgIdCode = dbUser.orgIdCode;
        token.orgColors = dbUser.organization?.colors as any;

        if (dbUser.orgIdCode) {
          const orgIdRecord = await prisma.orgID.findUnique({
            where: { code: dbUser.orgIdCode },
            select: { status: true, trialEndsAt: true },
          });
          if (orgIdRecord) {
            token.orgStatus = orgIdRecord.status as any;
            token.trialEndsAt = orgIdRecord.trialEndsAt?.toISOString();
          } else {
            delete token.orgStatus;
            delete token.trialEndsAt;
          }
        } else {
          delete token.orgStatus;
          delete token.trialEndsAt;
        }
      } catch (error) {
        console.error("JWT callback error:", error);
      }
      return token;
    },
    async session({ session, token }: any) {
      try {
        if (session.user && token.sub) {
          session.user.id = token.sub;
          session.user.role = token.role ?? "user";
          session.user.locale = token.locale ?? DEFAULT_LOCALE;
          session.user.orgId = token.orgId as string | null;
          session.user.orgIdCode = token.orgIdCode as string | null;
          session.user.orgColors = token.orgColors as any;
          session.user.orgStatus = token.orgStatus as any;
          session.user.trialEndsAt = token.trialEndsAt as string | null;
        }
      } catch (error) {
        console.error("Session callback error:", error);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: any) {
      if (!user.id) return;
      try {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const existingSub = await prisma.subscription.findFirst({ where: { userId: user.id } });
        if (!existingSub) {
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
        }

        const existingGoal = await prisma.studyGoal.findUnique({ where: { userId: user.id } });
        if (!existingGoal) {
          await prisma.studyGoal.create({ data: { userId: user.id, dailyMinutes: 20, weeklyTopics: 5 } });
        }
      } catch (error) {
        console.error("createUser event error:", error);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthOptions & { trustHost: boolean };
