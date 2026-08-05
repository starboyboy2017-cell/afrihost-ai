/**
 * Module 23 — Moteur de templates multilingues avec variables dynamiques.
 *
 * Rendu `{{var}}` (et variantes `{{var|default}}`). Le moteur est une fonction
 * pure, testable. Ne jamais exécuter d'arbitraire : seul le remplacement de
 * variables déclarées est supporté (aucune expression), par sécurité.
 */
import type { TemplateVars } from "./notifications.types.js";

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*(\|\s*([^}]*))?\s*\}\}/g;

function resolveVar(vars: TemplateVars, path: string): unknown {
  let val: unknown = vars;
  for (const part of path.split(".")) {
    if (typeof val === "object" && val !== null && part in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return val;
}

/** Remplace les variables {{var}} et {{var|default}} dans un texte. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(TOKEN, (_match, path: string, _def, defVal: string) => {
    const value = resolveVar(vars, path);
    if (value !== undefined && value !== null) return String(value);
    if (defVal !== undefined) return defVal;
    return "";
  });
}

/** Liste les variables attendues dans un template (pour validation). */
export function extractVariables(template: string): string[] {
  const out = new Set<string>();
  for (const m of template.matchAll(TOKEN)) out.add(m[1]!);
  return [...out];
}
