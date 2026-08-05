/**
 * Module 1 — Paramètres généraux : écran de configuration.
 * Vue simple qui lit et met à jour les réglages via l'API (RBAC côté serveur).
 * À enrichir (formulaire complet, sélecteur d'hôtel) une fois l'authentification branchée.
 */

type OrgSettings = {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  logoUrl?: string | null;
};

type HotelSettings = {
  id: string;
  name: string;
  currency: string;
  locale: string;
  timezone: string;
  vatRate: number;
};

export default async function SettingsPage() {
  // Chargement serveur (Server Component) via l'API interne.
  let org: OrgSettings | null = null;
  let hotels: HotelSettings[] = [];

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/org`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        organisation?: OrgSettings | null;
        hotels?: HotelSettings[];
      };
      org = data.organisation ?? null;
      hotels = data.hotels ?? [];
    }
  } catch {
    // hors-ligne / non connecté : afficher l'état neutre
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Paramètres généraux</h1>
      <p className="mt-1 text-sm text-gray-500">Module 1 — configuration de l&apos;organisation et des hôtels.</p>

      <section className="mt-6 rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Organisation</h2>
        {org ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-500">Nom</dt><dd>{org.name}</dd>
            <dt className="text-gray-500">Slug</dt><dd>{org.slug}</dd>
            <dt className="text-gray-500">Raison sociale</dt><dd>{org.legalName ?? "—"}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-amber-600">
            Authentification non connectée ou base indisponible. Les réglages apparaîtront ici une fois la
            connexion établie.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Hôtels</h2>
        {hotels.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucun hôtel configuré.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {hotels.map((h) => (
              <li key={h.id} className="rounded-md bg-gray-50 p-3 text-sm">
                <div className="font-medium">{h.name}</div>
                <div className="text-gray-500">
                  {h.currency} · {h.locale} · {h.timezone} · TVA {(h.vatRate * 100).toFixed(1)}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
