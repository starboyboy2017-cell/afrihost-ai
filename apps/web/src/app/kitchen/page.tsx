/**
 * Module 14 — Cuisine (Kitchen Display System) : écran.
 * (RBAC côté serveur : kitchen.view_orders)
 */
type OrderRow = {
  id: string; kitchenRef: string; status: string; priority: string;
  posOrderId: string; stationId: string; roomId?: string | null;
  receivedAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  SERVED: "bg-purple-100 text-purple-700",
  MODIFIED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function KitchenPage() {
  let orders: OrderRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/kitchen/orders`, { cache: "no-store" });
    if (res.ok) orders = ((await res.json()) as { orders?: OrderRow[] }).orders ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Cuisine (Kitchen Display)</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 14 — ordres de préparation intégrés au POS, cycle New→Served, priorités, temps réel.
        Isolation par hôtel.
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun ordre. Réceptionnez une commande POS via l&apos;API (`POST /api/kitchen/orders`).
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.kitchenRef}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-100"}`}>
                  {o.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Poste {o.stationId} · Priorité <b>{o.priority}</b>{o.roomId ? ` · Ch. ${o.roomId}` : ""}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Reçu {new Date(o.receivedAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
