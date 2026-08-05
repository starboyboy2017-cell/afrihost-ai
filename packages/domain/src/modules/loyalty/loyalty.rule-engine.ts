/**
 * Module 22 — Moteur de règles d'attribution de points.
 *
 * Entièrement **configurable** : aucune logique métier n'est codée en dur. Les
 * règles (`LoyaltyRule`) sont persistées et évaluées ici. Une règle se compose
 * de :
 *   - un `trigger` (type d'événement : nuit, dépense, service, promotion, ...) ;
 *   - une `condition` (Json, critères sur le contexte) ;
 *   - un calcul : `points + pointsPerUnit * base` appliqué au `multiplier`,
 *     plafonné par `capPerEvent`.
 *
 * Le moteur est une fonction pure, testable sans base de données.
 */
import type { LoyaltyRule, RuleContext, RuleEvaluation } from "./loyalty.types.js";

/** Opérateurs de comparaison supportés dans une condition. */
type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

/** Condition atomique : {"field","op","value"}. */
interface AtomicCondition {
  field: string;
  op: Op;
  value: unknown;
}

/** Condition composée : {"all": [...]} ou {"any": [...]}. */
type Condition = AtomicCondition | { all?: unknown[]; any?: unknown[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function resolveField(ctx: RuleContext, field: string): unknown {
  if (field === "amount") return ctx.amount;
  if (field === "nights") return ctx.nights;
  if (field === "count") return ctx.count;
  if (field === "sourceModule") return ctx.sourceModule;
  if (field === "channel") return ctx.channel;
  if (field === "segment") return ctx.segment;
  if (field === "roomTypeId") return ctx.roomTypeId;
  // chemin dans extra : "extra.foo.bar"
  if (field.startsWith("extra.")) {
    let val: unknown = ctx.extra ?? {};
    for (const part of field.slice(6).split(".")) {
      if (isRecord(val) && part in val) val = val[part];
      else return undefined;
    }
    return val;
  }
  if (ctx.extra && field in ctx.extra) return ctx.extra[field];
  return undefined;
}

function compare(actual: unknown, op: Op, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected || String(actual) === String(expected);
    case "neq":
      return actual !== expected && String(actual) !== String(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "in":
      return Array.isArray(expected) && expected.some((e) => String(e) === String(actual));
    case "contains":
      return typeof actual === "string" && String(expected) !== "" && actual.includes(String(expected));
    default:
      return false;
  }
}

/** Évalue une condition (Json) contre un contexte. */
export function evaluateCondition(condition: unknown, ctx: RuleContext): boolean {
  if (condition == null) return true;
  if (!isRecord(condition)) return true;
  if (Array.isArray(condition.all)) {
    return condition.all.every((c) => evaluateCondition(c, ctx));
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some((c) => evaluateCondition(c, ctx));
  }
  const cond = condition as unknown as AtomicCondition;
  if (typeof cond.field !== "string" || typeof cond.op !== "string") return true;
  const actual = resolveField(ctx, cond.field);
  return compare(actual, cond.op as Op, cond.value);
}

/** Retourne la base (unité) à multiplier selon le type de règle. */
function baseUnit(rule: LoyaltyRule, ctx: RuleContext): number {
  switch (rule.trigger) {
    case "spend_earned":
      return ctx.amount ?? 0;
    case "night_earned":
      return ctx.nights ?? 0;
    case "service_earned":
      return ctx.count ?? ctx.amount ?? 0;
    case "referral":
      return ctx.count ?? 0;
    default:
      return 0; // welcome, birthday, campaign, promotion, custom : points fixes
  }
}

/** Calcule les points d'une règle pour un contexte donné. */
export function computeRulePoints(rule: LoyaltyRule, ctx: RuleContext): number {
  if (!evaluateCondition(rule.condition, ctx)) return 0;
  const base = baseUnit(rule, ctx);
  const raw = rule.points + rule.pointsPerUnit * base;
  const multiplied = raw * rule.multiplier;
  const floored = Math.floor(multiplied);
  if (rule.capPerEvent != null) return Math.min(floored, rule.capPerEvent);
  return floored;
}

/**
 * Évalue un ensemble de règles actives pour un déclencheur donné, triées par
 * priorité (numéro le plus petit = priorité la plus haute).
 */
export function evaluateRules(
  rules: LoyaltyRule[],
  trigger: string,
  ctx: RuleContext,
): RuleEvaluation[] {
  return rules
    .filter((r) => r.isActive && r.trigger === trigger)
    .sort((a, b) => a.priority - b.priority)
    .map((r) => ({ ruleId: r.id, ruleName: r.name, points: computeRulePoints(r, ctx) }))
    .filter((e) => e.points > 0);
}
