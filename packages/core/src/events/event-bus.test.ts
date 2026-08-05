import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./event-bus.js";
import { DomainEvents } from "./event-catalog.js";

describe("EventBus", () => {
  it("appelle les handlers abonnés lors d'un publish", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe(DomainEvents.reservationConfirmed, handler);

    await bus.publish({
      name: DomainEvents.reservationConfirmed,
      hotelId: "h1",
      organisationId: "o1",
      data: { reservationId: "r1" },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]!.data).toEqual({ reservationId: "r1" });
    expect(handler.mock.calls[0]![0]!.hotelId).toBe("h1");
  });

  it("un désabonnement empêche les appels suivants", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(DomainEvents.paymentReceived, handler);

    await bus.publish({ name: DomainEvents.paymentReceived, hotelId: "h1", organisationId: "o1", data: {} });
    unsubscribe();
    await bus.publish({ name: DomainEvents.paymentReceived, hotelId: "h1", organisationId: "o1", data: {} });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("découple émetteur et consommateur (aucune référence croisée)", async () => {
    const bus = new EventBus();
    // module réservations émet
    const published = vi.fn();
    bus.subscribe(DomainEvents.reservationConfirmed, published);
    // module housekeeping écoute sans connaître l'émetteur
    const housekeeping = vi.fn();
    bus.subscribe(DomainEvents.reservationConfirmed, housekeeping);

    await bus.publish({ name: DomainEvents.reservationConfirmed, hotelId: "h1", organisationId: "o1", data: {} });

    expect(published).toHaveBeenCalledTimes(1);
    expect(housekeeping).toHaveBeenCalledTimes(1);
  });

  it("propagates handler errors unless swallowErrors", async () => {
    const bus = new EventBus();
    bus.subscribe(
      DomainEvents.reservationCreated,
      async () => {
        throw new Error("boom");
      },
      { swallowErrors: false },
    );

    await expect(
      bus.publish({ name: DomainEvents.reservationCreated, hotelId: "h1", organisationId: "o1", data: {} }),
    ).rejects.toThrow("boom");
  });
});
