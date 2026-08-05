import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables } from "./notifications.template-engine.js";

describe("notifications.template-engine", () => {
  it("remplace une variable simple", () => {
    expect(renderTemplate("Bonjour {{firstName}} !", { firstName: "Awa" })).toBe("Bonjour Awa !");
  });

  it("remplace un chemin imbriqué", () => {
    expect(renderTemplate("Réservation {{reservation.code}}", { reservation: { code: "RES-123" } })).toBe("Réservation RES-123");
  });

  it("applique une valeur par défaut via {{var|default}}", () => {
    expect(renderTemplate("Cher {{name|client}}", {})).toBe("Cher client");
    expect(renderTemplate("Cher {{name|client}}", { name: "Ali" })).toBe("Cher Ali");
  });

  it("laisse une chaîne vide si variable absente sans défaut", () => {
    expect(renderTemplate("X={{missing}}", {})).toBe("X=");
  });

  it("extrait les variables attendues", () => {
    const vars = extractVariables("{{firstName}} {{lastName}} {{reservation.code}}");
    expect(vars).toContain("firstName");
    expect(vars).toContain("lastName");
    expect(vars).toContain("reservation.code");
    expect(vars).toHaveLength(3);
  });

  it("n'exécute pas d'expression arbitraire (sécurité)", () => {
    // Aucun calcul / exécution : les tokens non reconnus (expressions, appels)
    // ne sont pas résolus et restent inchangés — aucun code n'est exécuté.
    const out = renderTemplate("{{ 1 + 1 }} et {{ malicious() }}", {});
    expect(out).toContain("{{ 1 + 1 }}");
    expect(out).toContain("{{ malicious() }}");
    expect(out).not.toContain("2 et");
  });
});
