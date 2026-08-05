/**
 * Module 2 — Gestion multihôtels : écran de gestion des hôtels.
 * Liste, création, désactivation. (RBAC côté serveur : hotels.create / hotels.update / hotels.disable)
 */
type Hotel = {
  id: string;
  name: string;
  slug: string;
  code: string;
  currency: string;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
};

export default async function HotelsPage() {
  let hotels: Hotel[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/hotels`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { hotels?: Hotel[] };
      hotels = data.hotels ?? [];
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Gestion multihôtels</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 2 — créer, modifier et désactiver vos établissements. Isolation des données garantie par hôtel.
      </p>

      <section className="mt-6 rounded-lg border p-5">
        <h2 className="text-lg font-semibold">Vos hôtels</h2>
        {hotels.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucun hôtel. Créez le premier ci-dessous.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {hotels.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {h.name} <span className="text-gray-400">({h.code})</span>
                  </div>
                  <div className="text-gray-500">
                    {h.city ?? "—"} · {h.country ?? "—"} · {h.currency}
                  </div>
                </div>
                <span
                  className={
                    h.isActive
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                      : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                  }
                >
                  {h.isActive ? "Actif" : "Désactivé"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-gray-400">
        Création / modification / désactivation via l&apos;API (`/api/hotels`) — le formulaire interactif
        complet sera fourni avec l&apos;authentification (Module 3). Rôles et permissions par hôtel via
        `POST /api/hotels/:id/memberships` (RBAC per-hotel).
      </p>
    </main>
  );
}
