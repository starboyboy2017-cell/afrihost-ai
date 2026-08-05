import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BootstrapService } from "@afrihost/domain";
import { AuditLogger, InMemoryAuditWriter, EventBus } from "@afrihost/core";
import { PrismaBootstrapRepository } from "@/modules/bootstrap/bootstrap.repository.prisma";

export async function GET() {
  const info: Record<string, unknown> = {};
  info.boostrapKeySet = !!process.env.BOOTSTRAP_KEY;
  info.boostrapKeyLen = process.env.BOOTSTRAP_KEY?.length;
  try {
    const repo = new PrismaBootstrapRepository();
    const svc = new BootstrapService(repo, new AuditLogger(new InMemoryAuditWriter()), new EventBus(), process.env.BOOTSTRAP_KEY ?? "fallback");
    try {
      const account = await svc.bootstrapFirstSuperAdmin({
        email: "superadmin@afrihost.com",
        password: "AfriHost2026!Secure",
        firstName: "Super", lastName: "Admin",
        bootstrapKey: "afrihost-prod-bootstrap-key-2026",
      }, { organisationId: "platform", hotelId: "saas" });
      info.result = "CREATED";
      info.account = account;
    } catch (e) { info.bootstrapError = e instanceof Error ? e.message : String(e); }
  } catch (e) { info.initError = e instanceof Error ? e.message : String(e); }
  // état après
  try { info.userCount = await prisma.user.count(); } catch (e) { info.userCountError = String(e); }
  return NextResponse.json(info);
}
