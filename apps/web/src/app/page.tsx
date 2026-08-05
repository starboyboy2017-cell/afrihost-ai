/**
 * Page d'accueil — AfriHost AI (tableau de bord de navigation).
 * Affiche les modules principaux du PMS avec liens vers chaque écran.
 */
const MODULES = [
  { href: "/hotels", label: "Hôtels", icon: "🏨" },
  { href: "/guests", label: "Clients (Guests)", icon: "👥" },
  { href: "/reservations", label: "Réservations", icon: "📅" },
  { href: "/frontdesk", label: "Front Desk", icon: "🛎️" },
  { href: "/stays", label: "Séjours", icon: "🛏️" },
  { href: "/room-types", label: "Types de chambres", icon: "🛌" },
  { href: "/housekeeping", label: "Housekeeping", icon: "🧹" },
  { href: "/maintenance", label: "Maintenance", icon: "🔧" },
  { href: "/laundry", label: "Blanchisserie", icon: "👕" },
  { href: "/transport", label: "Transport", icon: "🚐" },
  { href: "/pos", label: "POS Restaurant", icon: "🍽️" },
  { href: "/kitchen", label: "Cuisine", icon: "👨‍🍳" },
  { href: "/cash", label: "Caisse", icon: "💵" },
  { href: "/tips", label: "Pourboires", icon: "💰" },
  { href: "/inventory", label: "Stock", icon: "📦" },
  { href: "/accounting", label: "Comptabilité", icon: "🧾" },
  { href: "/billing", label: "Paiements & Facturation", icon: "💳" },
  { href: "/discounts", label: "Remises & Coupons", icon: "🏷️" },
  { href: "/crm", label: "CRM", icon: "🤝" },
  { href: "/loyalty", label: "Fidélité", icon: "⭐" },
  { href: "/notifications", label: "Notifications", icon: "🔔" },
  { href: "/ai", label: "IA", icon: "🤖" },
  { href: "/channel", label: "Channel Manager (OTA)", icon: "🌐" },
  { href: "/portal", label: "Portail Client", icon: "👤" },
  { href: "/mobile", label: "Plateforme Mobile", icon: "📱" },
  { href: "/events", label: "Événements & Groupes", icon: "🎪" },
  { href: "/bi", label: "Reporting & BI", icon: "📊" },
  { href: "/admin", label: "Administration", icon: "⚙️" },
  { href: "/public-api", label: "API Publique", icon: "🔌" },
  { href: "/saasadmin", label: "Super Administration", icon: "🛡️" },
  { href: "/audit", label: "Journal d'audit", icon: "📜" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-bold">AfriHost AI</h1>
        <p className="mt-1 text-sm text-gray-500">
          PMS SaaS multihôtel pour l&apos;Afrique — Production Ready. Sélectionnez un module pour commencer.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/inscription" className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">Inscrire mon hôtel</a>
          <a href="/connexion" className="rounded-md border px-3 py-1.5 text-xs font-medium">Connexion</a>
          <a href="/api/health" className="rounded-md border px-3 py-1.5 text-xs text-gray-600">État du système</a>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {MODULES.map((m) => (
          <a
            key={m.href}
            href={m.href}
            className="rounded-lg border p-4 transition hover:border-slate-400 hover:shadow"
          >
            <div className="text-2xl">{m.icon}</div>
            <div className="mt-2 text-sm font-semibold">{m.label}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
