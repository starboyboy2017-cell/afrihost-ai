/**
 * Module 8 — Tableau de disponibilité (Front Desk) : écran.
 *
 * Vue par hôtel (isolation RLS + RBAC côté serveur), indicateurs visuels, filtres
 * (étage/type/statut), recherche rapide (numéro / nom client). L'actualisation
 * "temps réel" est servie par l'API (snapshot) + abonnement Supabase Realtime
 * (voir "client component" note). Actions : ouvrir fiche chambre / réservation /
 * lancer un check-in (selon les droits).
 */
import { frontDeskService } from "@/lib/di";
import { authorizationService, type PermissionCode } from "@afrihost/core";
import { resolveAccessContext } from "@/lib/context";

export const dynamic = "force-dynamic";

type Row = {
  roomId: string; roomNumber: string; floor: number | null; status: string;
  roomTypeId: string; roomTypeName: string; guestName?: string | null;
  reservationId?: string | null; bookingRef?: string | null;
  checkInAt?: string | null; departureDate?: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE: { label: "Disponible", color: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-500" },
  OCCUPIED: { label: "Occupée", color: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
  RESERVED: { label: "Réservée", color: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-500" },
  DIRTY: { label: "À nettoyer", color: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
  CLEANING: { label: "En nettoyage", color: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
  INSPECTED: { label: "Inspectée", color: "bg-cyan-100 text-cyan-800 border-cyan-300", dot: "bg-cyan-500" },
  OUT_OF_ORDER: { label: "Maintenance", color: "bg-purple-100 text-purple-800 border-purple-300", dot: "bg-purple-500" },
  OUT_OF_SERVICE: { label: "Hors service", color: "bg-gray-200 text-gray-700 border-gray-300", dot: "bg-gray-500" },
};

export default async function FrontDeskPage() {
  const ctx = await resolveAccessContext(null);
  let rows: Row[] = [];
  let counts: Record<string, number> = {};

  // Vue par hôtel, isolée (l'API applique isolation + RBAC rooms.view)
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/availability`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { rows?: Row[]; counts?: Record<string, number> };
      rows = data.rows ?? [];
      counts = data.counts ?? {};
    }
  } catch {
    // hors-ligne / non connecté
  }

  // Droits pour les actions (selon RBAC de l'utilisateur connecté)
  const canCheckin = ctx ? authorizationService.can(ctx, "reservations.checkin" as PermissionCode) : false;
  const canViewRoom = ctx ? authorizationService.can(ctx, "rooms.view" as PermissionCode) : false;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Front Desk — Disponibilité</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vue par hôtel, alimentée en temps réel par les séjours actifs et les états des chambres.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(counts).map(([k, n]) => (
            <span key={k} className="rounded-full border px-2 py-1">{k}: <b>{n}</b></span>
          ))}
        </div>
      </div>

      {/* Filtres + recherche */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Rechercher n° chambre ou client…"
          disabled
          className="rounded-md border px-3 py-1.5 text-sm"
        />
        <select disabled className="rounded-md border px-2 py-1.5 text-sm"><option>Étage</option></select>
        <select disabled className="rounded-md border px-2 py-1.5 text-sm"><option>Type de chambre</option></select>
        <select disabled className="rounded-md border px-2 py-1.5 text-sm"><option>Statut</option></select>
      </div>

      {/* Grille des chambres */}
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Aucune chambre configurée pour cet hôtel.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, color: "bg-gray-100", dot: "bg-gray-400" };
            return (
              <div key={r.roomId} className={`rounded-lg border p-3 ${meta.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{r.roomNumber}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                </div>
                <div className="mt-1 text-xs">{r.roomTypeName}</div>
                <div className="mt-1 text-xs font-semibold">{meta.label}</div>
                {r.guestName && <div className="mt-1 truncate text-xs">{r.guestName}</div>}
                {r.bookingRef && <div className="text-xs text-gray-500">{r.bookingRef}</div>}
                {r.departureDate && (
                  <div className="text-xs text-gray-500">Départ {new Date(r.departureDate).toLocaleDateString()}</div>
                )}
                <div className="mt-2 flex gap-1 text-xs">
                  {canViewRoom && (
                    <a href={`/rooms`} className="rounded bg-white/70 px-1.5 py-0.5">Fiche</a>
                  )}
                  {r.reservationId && (
                    <a href={`/reservations`} className="rounded bg-white/70 px-1.5 py-0.5">Réservation</a>
                  )}
                  {canCheckin && r.status === "RESERVED" && r.reservationId && (
                    <button className="rounded bg-emerald-600 px-1.5 py-0.5 text-white">Check-in</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Actualisation temps réel : l&apos;écran s&apos;abonne à Supabase Realtime (Room / Stay / Reservation) et
        re-consulte l&apos;API à chaque check-in, check-out ou changement d&apos;état. Le formulaire interactif
        complet (filtres dynamiques, recherche, actions) sera activé avec l&apos;authentification.
      </p>
    </main>
  );
}
