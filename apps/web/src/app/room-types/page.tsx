/**
 * Module 5 — Types de chambres & tarifs : écran.
 * (RBAC côté serveur : rooms.view)
 */
type RoomTypeRow = {
  id: string;
  name: string;
  baseRate: number;
  maxOccupancy: number;
  bedCount: number;
  amenities: string[];
  isActive: boolean;
};

export default async function RoomTypesPage() {
  let roomTypes: RoomTypeRow[] = [];
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/room-types`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { roomTypes?: RoomTypeRow[] };
      roomTypes = data.roomTypes ?? [];
    }
  } catch {
    // hors-ligne / non connecté
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Types de chambres & tarifs</h1>
      <p className="mt-1 text-sm text-gray-500">
        Module 5 — catégories de chambres et plans tarifaires flexibles (saisons, devises, restrictions).
      </p>

      {roomTypes.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          Aucun type de chambre. Créez-en via l&apos;API (`POST /api/room-types`).
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {roomTypes.map((rt) => (
            <div key={rt.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{rt.name}</h3>
                <span
                  className={
                    rt.isActive
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                      : "rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600"
                  }
                >
                  {rt.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {(rt.baseRate / 100).toFixed(2)} / nuit · {rt.maxOccupancy} pers. · {rt.bedCount} lit(s)
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {rt.amenities.map((a) => (
                  <span key={a} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        Tarifs flexibles : plusieurs plans par type (`POST /api/rate-plans`), prix par devise
        (`/api/rate-plans?currency=..&date=..`), restrictions (`minNights`, etc.).
      </p>
    </main>
  );
}
