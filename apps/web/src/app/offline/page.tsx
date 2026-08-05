export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="text-5xl">📡</div>
        <h1 className="mt-4 text-xl font-bold">Mode hors connexion</h1>
        <p className="mt-2 text-sm text-gray-500">
          Vous êtes hors ligne. AfriHost AI se reconnectera automatiquement et
          synchronisera vos modifications dès que la connexion sera rétablie.
        </p>
      </div>
    </main>
  );
}
