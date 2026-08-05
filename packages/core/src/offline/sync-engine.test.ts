import { describe, it, expect, vi } from "vitest";
import { InMemoryOutboxStore, type OutboxEntry } from "./outbox.js";
import { SyncEngine, lastWriteWins, type SyncClient } from "./sync-engine.js";
import { uuidv7 } from "./idgen.js";

interface Entity {
  id: string;
  updatedAt: number;
  deletedAt?: number | null;
  status?: string;
}

function fakeClient(remoteDb: Map<string, Entity>): SyncClient {
  return {
    async push(_type, operation, entity) {
      if (operation === "DELETE") {
        remoteDb.delete(entity.id);
        return { ok: true, remote: entity };
      }
      remoteDb.set(entity.id, entity as Entity);
      return { ok: true, remote: entity };
    },
    async pull(since, _hotelId) {
      const entities = [...remoteDb.values()].filter((e) => e.updatedAt >= since);
      return { entities };
    },
  };
}

describe("SyncEngine (offline-first)", () => {
  it("pousse les écritures locales de l'outbox vers le serveur", async () => {
    const outbox = new InMemoryOutboxStore();
    const remoteDb = new Map<string, Entity>();
    const engine = new SyncEngine(outbox, fakeClient(remoteDb));
    const upsert = vi.fn();

    const id = uuidv7();
    await outbox.enqueue({
      id: uuidv7(),
      entityType: "Reservation",
      entityId: id,
      operation: "CREATE",
      payload: { id, updatedAt: 100, status: "CONFIRMED" },
    });

    const res = await engine.sync("h1", 0, upsert);

    expect(res.pushed).toBe(1);
    expect(res.errors).toBe(0);
    expect(remoteDb.has(id)).toBe(true);
    expect((await outbox.pending())).toHaveLength(0);
  });

  it("tire les changements distants et les écrit en local", async () => {
    const outbox = new InMemoryOutboxStore();
    const remoteDb = new Map<string, Entity>([
      ["r9", { id: "r9", updatedAt: 500, status: "CHECKED_IN" }],
    ]);
    const engine = new SyncEngine(outbox, fakeClient(remoteDb));
    const local: Entity[] = [];
    const upsert = async (e: Entity) => {
      local.push(e);
    };

    await engine.sync("h1", 0, upsert);

    expect(local.some((e) => e.id === "r9")).toBe(true);
  });

  it("résout les conflits en LWW (updatedAt le plus récent gagne)", () => {
    const local = { id: "x", updatedAt: 200, status: "LOCAL" };
    const remote = { id: "x", updatedAt: 100, status: "REMOTE" };
    const winner = lastWriteWins(local, remote);
    expect(winner.status).toBe("LOCAL");

    const remote2 = { id: "x", updatedAt: 300, status: "REMOTE2" };
    expect(lastWriteWins(local, remote2).status).toBe("REMOTE2");
  });

  it("génère des UUID v7 uniques et correctement formatés", () => {
    const a = uuidv7();
    const b = uuidv7();
    // unicité (même si générés dans la même milliseconde)
    expect(a).not.toBe(b);
    // format UUID + nibble de version = 7
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("les UUID v7 sont ordonnables temporellement", async () => {
    const first = uuidv7();
    // attente pour garantir un timestamp différent (résolution ms)
    await new Promise((r) => setTimeout(r, 20));
    const second = uuidv7();
    // les 12 premiers hexadécimaux codent le timestamp (48 bits)
    expect(second.slice(0, 12) > first.slice(0, 12)).toBe(true);
  });
});
