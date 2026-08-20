import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true, ids: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, slug, prefix, colors, ...limits } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const finalPrefix = (prefix || name.trim().slice(0, 2)).toUpperCase();

    const org = await prisma.organization.create({
      data: { 
        name, 
        slug, 
        prefix: finalPrefix, 
        colors,
        ...limits // Spread the specific limit fields if they match the schema
      },
    });
    return NextResponse.json(org);
  } catch (error) {
    console.error("Org creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
