export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">AfriHost AI</h1>
      <p className="max-w-xl text-muted-foreground">
        Phase 0 — Fondation validée : multihôtel, RBAC complet, journal d'audit,
        mode hors-ligne et Event Bus sont opérationnels.
      </p>
      <a
        href="/api/health"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Vérifier l'état (health check)
      </a>
    </main>
  );
}
