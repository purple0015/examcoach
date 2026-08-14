import type { DefaultSession } from "next-auth";
import type { Locale } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      locale: Locale;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    locale?: Locale;
  }
}
