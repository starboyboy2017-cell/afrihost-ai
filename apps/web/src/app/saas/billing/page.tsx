/**
 * Module 32 — Billing SaaS : Super Administration.
 * (RBAC côté serveur : saas.plans — réservé au Super Admin, jamais au portail hôtels/clients)
 */
type PlanRow = { id: string; code: string; name: string; price: number; currency: string; billingCycle: string; maxHotels: number; maxUsers: number; isActive: boolean };
type SubRow = { id: string; organisationId: string; status: string; billingCycle: string; price: number; currency: string; renewsAt?: string | null };
type InvoiceRow = { id: string; number: string; status: string; amount: number; taxAmount: number; total: number; currency: string };
type MethodRow = { id: string; methodKey: string; name: string; type: string; isActive: boolean };

export default async function SaasBillingPage() {
  let plans: PlanRow[] = [];
  let subscriptions: SubRow[] = [];
  let invoices: InvoiceRow[] = [];
  let methods: MethodRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const [pl, su, inv, me] = await Promise.all([
      fetch(`${base}/api/saas/plans?includeInactive=true`, { cache: "no-store" }),
      fetch(`${base}/api/saas/subscriptions`, { cache: "no-store" }),
      fetch(`${base}/api/saas/invoices`, { cache: "no-store" }),
      fetch(`${base}/api/saas/payment-methods`, { cache: "no-store" }),
    ]);
    if (pl.ok) plans = ((await pl.json()) as { plans?: PlanRow[] }).plans ?? [];
    if (su.ok) subscriptions = ((await su.json()) as { subscriptions?: SubRow[] }).subscriptions ?? [];
    if (inv.ok) invoices = ((await inv.json()) as { invoices?: InvoiceRow[] }).invoices ?? [];
    if (me.ok) methods = ((await me.json()) as { methods?: MethodRow[] }).methods ?? [];
  } catch {
    // hors-ligne / non connecté
  }

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING").length;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold">Super Administration — Billing SaaS</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 32 — abonnements, plans, facturation, paiements. <strong>Accessible exclusivement depuis le
        portail Super Administration</strong> (jamais depuis le portail hôtels ni clients).
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Plans</h2>
          <p className="mt-1 text-3xl font-bold">{plans.length}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Abonnements actifs</h2>
          <p className="mt-1 text-3xl font-bold">{activeSubs}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Factures en attente</h2>
          <p className="mt-1 text-3xl font-bold">{pendingInvoices}</p>
        </section>
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-600">Moyens de paiement</h2>
          <p className="mt-1 text-3xl font-bold">{methods.length}</p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Plans ({plans.length})</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Code</th><th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Prix</th><th className="px-4 py-2">Cycle</th>
                <th className="px-4 py-2">Hôtels</th><th className="px-4 py-2">Utilisateurs</th><th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && <tr><td className="px-4 py-2 text-gray-500" colSpan={7}>Aucun plan.</td></tr>}
              {plans.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2"><code>{p.code}</code></td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.price} {p.currency}</td>
                  <td className="px-4 py-2">{p.billingCycle}</td>
                  <td className="px-4 py-2">{p.maxHotels}</td>
                  <td className="px-4 py-2">{p.maxUsers}</td>
                  <td className="px-4 py-2">{p.isActive ? "actif" : "inactif"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Abonnements ({subscriptions.length})</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {subscriptions.length === 0 && <p className="text-gray-500">Aucun abonnement.</p>}
          {subscriptions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded border px-3 py-2">
              <span>Org <code>{s.organisationId.slice(0, 8)}</code> · {s.billingCycle}</span>
              <span className="text-xs">{s.price} {s.currency} · {s.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
