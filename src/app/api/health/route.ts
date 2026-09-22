import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Attempt a simple query to verify DB connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ 
      status: "ok", 
      database: "connected",
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("Health check database failure:", error);
    return NextResponse.json({ 
      status: "error", 
      database: "disconnected",
      message: error.message,
      timestamp: new Date().toISOString() 
    }, { status: 503 });
  }
}
