/**
 * Module 18 — Stock & inventaire : écran.
 * (RBAC côté serveur : inventory.view)
 */
type WarehouseRow = { id: string; name: string; location?: string | null; isActive: boolean };
type SupplierRow = { id: string; name: string; phone?: string | null; email?: string | null };

export default async function InventoryPage() {
  let warehouses: WarehouseRow[] = [];
  let suppliers: SupplierRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [w, s] = await Promise.all([
      fetch(`${base}/api/inventory/warehouses`, { cache: "no-store" }),
      fetch(`${base}/api/inventory/suppliers`, { cache: "no-store" }),
    ]);
    if (w.ok) warehouses = ((await w.json()) as { warehouses?: WarehouseRow[] }).warehouses ?? [];
    if (s.ok) suppliers = ((await s.json()) as { suppliers?: SupplierRow[] }).suppliers ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Stock & inventaire</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 18 — entrepôts, fournisseurs, approvisionnements, réceptions, mouvements, inventaires,
        alertes de réapprovisionnement. Isolation par hôtel.
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Entrepôts ({warehouses.length})</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {warehouses.length === 0 && <p className="text-sm text-gray-500">Aucun entrepôt.</p>}
          {warehouses.map((w) => (
            <span key={w.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm">{w.name}</span>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-600">Fournisseurs ({suppliers.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {suppliers.length === 0 && <p className="text-gray-500">Aucun fournisseur.</p>}
          {suppliers.map((s) => (
            <li key={s.id}>{s.name} {s.phone ? `· ${s.phone}` : ""}</li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-gray-400">
        API : `/api/inventory/warehouses`, `/api/inventory/suppliers`, `/api/inventory/receive`,
        `/api/inventory/movements`, `/api/inventory/stock-count`, `/api/inventory/low-stock`,
        `/api/inventory/purchase-orders`.
      </p>
    </main>
  );
}
