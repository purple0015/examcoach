import type { DefaultSession } from "next-auth";
import type { Locale } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      locale: Locale;
      orgId?: string | null;
      orgIdCode?: string | null;
      orgColors?: { primary: string; accent: string } | null;
      orgStatus?: "trial" | "paid" | null;
      trialEndsAt?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    locale?: Locale;
    orgId?: string | null;
    orgIdCode?: string | null;
    orgColors?: { primary: string; accent: string } | null;
    orgStatus?: "trial" | "paid" | null;
    trialEndsAt?: string | null;
  }
}
