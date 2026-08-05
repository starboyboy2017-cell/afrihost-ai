import { describe, it, expect } from "vitest";
import { assertRoomTransition, nextRoomStatuses, isUnavailable } from "./rooms.state.js";
import { RoomError } from "./rooms.error.js";

describe("Machine à états des chambres (BR-4.2)", () => {
  it("autorise AVAILABLE → RESERVED → OCCUPIED → DIRTY → CLEANING → INSPECTED → AVAILABLE", () => {
    expect(() => assertRoomTransition("AVAILABLE", "RESERVED")).not.toThrow();
    expect(() => assertRoomTransition("RESERVED", "OCCUPIED")).not.toThrow();
    expect(() => assertRoomTransition("OCCUPIED", "DIRTY")).not.toThrow();
    expect(() => assertRoomTransition("DIRTY", "CLEANING")).not.toThrow();
    expect(() => assertRoomTransition("CLEANING", "INSPECTED")).not.toThrow();
    expect(() => assertRoomTransition("INSPECTED", "AVAILABLE")).not.toThrow();
  });

  it("autorise RESERVED → AVAILABLE (annulation)", () => {
    expect(() => assertRoomTransition("RESERVED", "AVAILABLE")).not.toThrow();
  });

  it("autorise la mise hors service depuis tout état", () => {
    for (const s of ["AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "INSPECTED"] as const) {
      expect(() => assertRoomTransition(s, "OUT_OF_ORDER")).not.toThrow();
      expect(() => assertRoomTransition(s, "OUT_OF_SERVICE")).not.toThrow();
    }
  });

  it("rejette les transitions illégales", () => {
    expect(() => assertRoomTransition("AVAILABLE", "OCCUPIED")).toThrow(RoomError);
    expect(() => assertRoomTransition("DIRTY", "AVAILABLE")).toThrow(RoomError); // passe par CLEANING/INSPECTED
    expect(() => assertRoomTransition("CLEANING", "OCCUPIED")).toThrow(RoomError);
    expect(() => assertRoomTransition("INSPECTED", "DIRTY")).toThrow(RoomError);
  });

  it("isUnavailable détecte hors service", () => {
    expect(isUnavailable("OUT_OF_ORDER")).toBe(true);
    expect(isUnavailable("OUT_OF_SERVICE")).toBe(true);
    expect(isUnavailable("AVAILABLE")).toBe(false);
  });

  it("nextRoomStatuses expose les états atteignables", () => {
    expect(nextRoomStatuses("DIRTY")).toContain("CLEANING");
    expect(nextRoomStatuses("OCCUPIED")).toContain("DIRTY");
  });
});
