import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const preferencesSchema = z.object({
  locale: z.enum(["en", "nd", "sn"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Anonymous visitors keep their preference in the cookie only.
    return NextResponse.json({ persisted: false });
  }

  const parsed = preferencesSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: parsed.data });
  return NextResponse.json({ persisted: true, ...parsed.data });
}
