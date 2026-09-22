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
        const user = credentials.type === "id"
          ? await prisma.user.findUnique({ where: { orgIdCode: credentials.identifier.toUpperCase() } })
          : await prisma.user.findUnique({ where: { email: credentials.identifier.toLowerCase() } });
        if (!user?.password || !(await bcrypt.compare(credentials.password, user.password))) return null;
        if (user.orgIdCode) {
          const orgIdRecord = await prisma.orgID.findUnique({ where: { code: user.orgIdCode } });
          if (orgIdRecord?.status === "trial" && orgIdRecord.trialEndsAt && new Date() > orgIdRecord.trialEndsAt) throw new Error("TRIAL_EXPIRED");
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
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
  }));
}

// Let NextAuth derive cookie names/options from NEXTAUTH_URL. A hand-written
// __Secure state cookie can be set on one hostname and returned to another,
// producing "State cookie was missing" behind Render/custom domains.
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", newUser: "/dashboard" },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, locale: true, email: true, orgId: true, orgIdCode: true, organization: { select: { colors: true } } } });
        if (!dbUser) { delete token.sub; return token; }
        const shouldBeAdmin = !!process.env.ADMIN_EMAIL && dbUser.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
        token.role = shouldBeAdmin ? "admin" : dbUser.role;
        token.locale = isLocale(dbUser.locale) ? dbUser.locale : DEFAULT_LOCALE;
        token.orgId = dbUser.orgId;
        token.orgIdCode = dbUser.orgIdCode;
        token.orgColors = dbUser.organization?.colors as any;
      } catch (error) { console.error("JWT callback error:", error); }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "user";
        session.user.locale = token.locale ?? DEFAULT_LOCALE;
        session.user.orgId = token.orgId as string | null;
        session.user.orgIdCode = token.orgIdCode as string | null;
        session.user.orgColors = token.orgColors as any;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: any) {
      if (!user.id) return;
      try {
        const trialEndDate = new Date(); trialEndDate.setDate(trialEndDate.getDate() + 7);
        if (!(await prisma.subscription.findFirst({ where: { userId: user.id } }))) await prisma.subscription.create({ data: { userId: user.id, tier: "free_trial", status: "active", trialStartDate: new Date(), trialEndDate, maxSeats: 1 } });
        if (!(await prisma.studyGoal.findUnique({ where: { userId: user.id } }))) await prisma.studyGoal.create({ data: { userId: user.id, dailyMinutes: 20, weeklyTopics: 5 } });
      } catch (error) { console.error("createUser event error:", error); }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthOptions & { trustHost: boolean };
