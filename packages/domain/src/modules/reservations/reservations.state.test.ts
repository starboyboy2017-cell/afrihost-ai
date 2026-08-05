import { describe, it, expect } from "vitest";
import { assertTransition, nextStatuses } from "./reservations.state.js";
import { ReservationError } from "./reservations.error.js";

describe("Machine à états réservations (BR-5.3)", () => {
  it("autorise PROVISIONAL → CONFIRMED | CANCELLED", () => {
    expect(() => assertTransition("PROVISIONAL", "CONFIRMED")).not.toThrow();
    expect(() => assertTransition("PROVISIONAL", "CANCELLED")).not.toThrow();
  });

  it("autorise CONFIRMED → CHECKED_IN | CANCELLED | NO_SHOW", () => {
    for (const to of ["CHECKED_IN", "CANCELLED", "NO_SHOW"] as const) {
      expect(() => assertTransition("CONFIRMED", to)).not.toThrow();
    }
  });

  it("autorise CHECKED_IN → CHECKED_OUT | CANCELLED", () => {
    expect(() => assertTransition("CHECKED_IN", "CHECKED_OUT")).not.toThrow();
    expect(() => assertTransition("CHECKED_IN", "CANCELLED")).not.toThrow();
  });

  it("autorise WAITLIST → PROVISIONAL", () => {
    expect(() => assertTransition("WAITLIST", "PROVISIONAL")).not.toThrow();
  });

  it("rejette les transitions illégales", () => {
    expect(() => assertTransition("PROVISIONAL", "CHECKED_IN")).toThrow(ReservationError);
    expect(() => assertTransition("CONFIRMED", "PROVISIONAL")).toThrow(ReservationError);
    expect(() => assertTransition("CANCELLED", "CONFIRMED")).toThrow(ReservationError);
    expect(() => assertTransition("NO_SHOW", "CHECKED_IN")).toThrow(ReservationError);
    expect(() => assertTransition("CHECKED_OUT", "CHECKED_OUT")).not.toThrow(); // no-op
  });

  it("nextStatuses expose les statuts atteignables", () => {
    expect(nextStatuses("CONFIRMED")).toEqual(["CHECKED_IN", "CANCELLED", "NO_SHOW"]);
    expect(nextStatuses("CANCELLED")).toEqual([]);
  });
});
