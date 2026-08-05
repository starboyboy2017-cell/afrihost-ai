import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
export async function GET() {
  const info: Record<string, unknown> = {};
  info.hasDatabaseUrl = !!process.env.DATABASE_URL;
  info.host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : null;
  try {
    const p = new PrismaClient();
    await p.$queryRaw`select 1 as ok`;
    info.db = "OK";
    await p.$disconnect();
  } catch (e) { info.dbError = e instanceof Error ? e.message : String(e); }
  return NextResponse.json(info);
}
