import { describe, it, expect } from "vitest";
import { evaluateCondition, computeRulePoints, evaluateRules } from "./loyalty.rule-engine.js";
import type { LoyaltyRule, RuleContext } from "./loyalty.types.js";

function rule(partial: Partial<LoyaltyRule> & { id: string; trigger: string }): LoyaltyRule {
  return {
    programId: "p1", hotelId: "h1", name: "r", condition: null, points: 0, pointsPerUnit: 0,
    multiplier: 1, capPerEvent: null, priority: 100, isActive: true, ...partial,
  };
}

describe("loyalty.rule-engine", () => {
  it("évalue une condition simple gte", () => {
    const cond = { field: "amount", op: "gte", value: 10000 };
    expect(evaluateCondition(cond, { guestId: "g", amount: 12000 })).toBe(true);
    expect(evaluateCondition(cond, { guestId: "g", amount: 5000 })).toBe(false);
  });

  it("évalue une condition composée all/any", () => {
    const all = { all: [{ field: "amount", op: "gte", value: 10000 }, { field: "nights", op: "gte", value: 2 }] };
    expect(evaluateCondition(all, { guestId: "g", amount: 15000, nights: 3 })).toBe(true);
    expect(evaluateCondition(all, { guestId: "g", amount: 15000, nights: 1 })).toBe(false);
    const any = { any: [{ field: "channel", op: "eq", value: "direct" }, { field: "channel", op: "eq", value: "agency" }] };
    expect(evaluateCondition(any, { guestId: "g", channel: "agency" })).toBe(true);
    expect(evaluateCondition(any, { guestId: "g", channel: "ota" })).toBe(false);
  });

  it("évalue in et contains", () => {
    expect(evaluateCondition({ field: "sourceModule", op: "in", value: ["pos", "billing"] }, { guestId: "g", sourceModule: "pos" })).toBe(true);
    expect(evaluateCondition({ field: "channel", op: "contains", value: "book" }, { guestId: "g", channel: "booking" })).toBe(true);
  });

  it("résout un champ dans extra (chemin)", () => {
    expect(evaluateCondition({ field: "extra.roomType", op: "eq", value: "suite" }, { guestId: "g", extra: { roomType: "suite" } })).toBe(true);
  });

  it("absencé de condition => vrai", () => {
    expect(evaluateCondition(null, { guestId: "g" })).toBe(true);
    expect(evaluateCondition(undefined, { guestId: "g" })).toBe(true);
  });

  it("calcule les points fixes", () => {
    const r = rule({ id: "w", trigger: "welcome", points: 500 });
    expect(computeRulePoints(r, { guestId: "g" })).toBe(500);
  });

  it("calcule points par dépense + multiplicateur", () => {
    const r = rule({ id: "s", trigger: "spend_earned", pointsPerUnit: 1, multiplier: 2 });
    expect(computeRulePoints(r, { guestId: "g", amount: 500 })).toBe(1000);
  });

  it("calcule points par nuit avec plafond", () => {
    const r = rule({ id: "n", trigger: "night_earned", pointsPerUnit: 100, multiplier: 1, capPerEvent: 350 });
    expect(computeRulePoints(r, { guestId: "g", nights: 3 })).toBe(300);
    expect(computeRulePoints(r, { guestId: "g", nights: 5 })).toBe(350);
  });

  it("applique le multiplicateur promotionnel", () => {
    const r = rule({ id: "p", trigger: "promotion", points: 200, multiplier: 3 });
    expect(computeRulePoints(r, { guestId: "g" })).toBe(600);
  });

  it("evaluateRules filtre par trigger actif et priorité", () => {
    const rules = [
      rule({ id: "r1", trigger: "spend_earned", name: "base", pointsPerUnit: 1, priority: 200 }),
      rule({ id: "r2", trigger: "spend_earned", name: "vip", pointsPerUnit: 1, multiplier: 2, condition: { field: "segment", op: "eq", value: "VIP" }, priority: 100 }),
      rule({ id: "r3", trigger: "night_earned", name: "night", points: 10, isActive: true }),
    ];
    const res = evaluateRules(rules, "spend_earned", { guestId: "g", amount: 100, segment: "VIP" });
    expect(res).toHaveLength(2);
    expect(res[0]!.ruleName).toBe("vip"); // priorité la plus haute d'abord
    expect(res[0]!.points).toBe(200);
    expect(res[1]!.points).toBe(100);
    // r3 est hors déclencheur
    expect(evaluateRules(rules, "night_earned", { guestId: "g" })).toHaveLength(1);
  });

  it("ignore une règle dont la condition échoue", () => {
    const rules = [rule({ id: "r1", trigger: "spend_earned", name: "base", pointsPerUnit: 1, condition: { field: "amount", op: "gte", value: 1000 } })];
    expect(evaluateRules(rules, "spend_earned", { guestId: "g", amount: 50 })).toHaveLength(0);
  });
});
