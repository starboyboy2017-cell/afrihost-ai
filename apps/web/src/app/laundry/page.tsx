/**
 * Module 11 — Blanchisserie : écran.
 * (RBAC côté serveur : laundry.view)
 */
type ItemRow = { id: string; code?: string | null; state: string; itemTypeId: string };
type TypeRow = { id: string; name: string; unit?: string | null };
type StockRow = { itemTypeId: string; name: string; clean: number; total: number };

export default async function LaundryPage() {
  let items: ItemRow[] = [];
  let types: TypeRow[] = [];
  let stock: StockRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [i, t] = await Promise.all([
      fetch(`${base}/api/laundry/items`, { cache: "no-store" }),
      fetch(`${base}/api/laundry/item-types`, { cache: "no-store" }),
    ]);
    if (i.ok) items = ((await i.json()) as { items?: ItemRow[] }).items ?? [];
    if (t.ok) types = ((await t.json()) as { types?: TypeRow[] }).types ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const typeName = (id: string) => types.find((x) => x.id === id)?.name ?? id;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Blanchisserie</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 11 — gestion du linge (cycle complet), lots de lavage, pertes. Isolation par hôtel.
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Types de linge</h2>
        {types.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucun type. Créez-en via l&apos;API (`POST /api/laundry/item-types`).</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {types.map((t) => (
              <li key={t.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{t.name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Pièces de linge ({items.length})</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((it) => (
            <span key={it.id} className="rounded border px-2 py-1 text-xs">
              {typeName(it.itemTypeId)} · <b>{it.state}</b>
            </span>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-gray-400">
        Cycle : propre → distribué → utilisé → sale → lavage → séchage → repassage → propre.
        API : `/api/laundry/items`, `/api/laundry/batches`, `/api/laundry/losses`, `/api/laundry/items/:id/state`.
      </p>
    </main>
  );
}
