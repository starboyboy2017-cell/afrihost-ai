import { describe, it, expect } from "vitest";
import { AuditLogger, InMemoryAuditWriter } from "./audit.js";

describe("AuditLogger (append-only)", () => {
  it("journalise les mutations", async () => {
    const writer = new InMemoryAuditWriter();
    const audit = new AuditLogger(writer);

    await audit.logCreate(
      { organisationId: "o1", hotelId: "h1", actorUserId: "u1" },
      "Reservation",
      "r1",
      { status: "CONFIRMED" },
    );
    await audit.logUpdate(
      { organisationId: "o1", hotelId: "h1", actorUserId: "u1" },
      "Reservation",
      "r1",
      { status: "CONFIRMED" },
      { status: "CHECKED_IN" },
    );

    expect(writer.entries).toHaveLength(2);
    expect(writer.entries[0]!.action).toBe("reservation.create");
    expect(writer.entries[1]!.action).toBe("reservation.update");
    expect(writer.entries[1]!.before).toEqual({ status: "CONFIRMED" });
    expect(writer.entries[1]!.after).toEqual({ status: "CHECKED_IN" });
    expect(writer.entries[0]!.hotelId).toBe("h1");
  });

  it("expose uniquement write (append-only), pas de update/delete", async () => {
    const writer = new InMemoryAuditWriter();
    const audit = new AuditLogger(writer);
    // Seule la méthode write (et helpers) existe — pas de méthode d'édition.
    expect(typeof audit.write).toBe("function");
    expect((audit as unknown as Record<string, unknown>)["update"]).toBeUndefined();
    expect((audit as unknown as Record<string, unknown>)["delete"]).toBeUndefined();
  });
});
