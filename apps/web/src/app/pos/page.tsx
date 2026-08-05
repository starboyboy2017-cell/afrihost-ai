/**
 * Module 13 — POS Restaurant : écran.
 * (RBAC côté serveur : pos.view)
 */
type PosOrderRow = {
  id: string; orderRef: string; status: string; posPointId: string;
  subtotal: number; taxAmount: number; discountAmount: number; total: number; currency: string;
  reservationId?: string | null; roomId?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-gray-100 text-gray-700",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

export default async function PosPage() {
  let orders: PosOrderRow[] = [];
  let revenue = 0;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [o, r] = await Promise.all([
      fetch(`${base}/api/pos/orders`, { cache: "no-store" }),
      fetch(`${base}/api/pos/orders/revenue`, { cache: "no-store" }),
    ]);
    if (o.ok) orders = ((await o.json()) as { orders?: PosOrderRow[] }).orders ?? [];
    if (r.ok) revenue = ((await r.json()) as { revenue?: number }).revenue ?? 0;
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">POS Restaurant</h1>
          <p className="mt-1 text-sm text-gray-500">
            Module 13 — commandes, encaissements, remboursements, chiffre d&apos;affaires. Isolation par hôtel.
          </p>
        </div>
        <div className="rounded-lg border px-4 py-2 text-right">
          <div className="text-xs text-gray-500">Chiffre d&apos;affaires</div>
          <div className="text-lg font-bold">{(revenue / 100).toFixed(2)} XOF</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucune commande. Créez-en via l&apos;API (`POST /api/pos/orders`).
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-3">Réf.</th>
              <th className="py-2 pr-3">Statut</th>
              <th className="py-2 pr-3">Lien</th>
              <th className="py-2 pr-3">Sous-total</th>
              <th className="py-2 pr-3">Taxes</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2 pr-3 font-medium">{o.orderRef}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-100"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-2 pr-3 text-xs">{o.roomId ? `Ch. ${o.roomId}` : o.reservationId ? "Rés." : "—"}</td>
                <td className="py-2 pr-3">{(o.subtotal / 100).toFixed(2)}</td>
                <td className="py-2 pr-3">{(o.taxAmount / 100).toFixed(2)}</td>
                <td className="py-2 text-right font-medium">{(o.total / 100).toFixed(2)} {o.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
