"use client";
/**
 * Page de connexion des hôtels / personnel.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Connexion échouée"); return; }
      router.push("/");
      router.refresh();
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center p-8">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-gray-500">Accédez à votre établissement AfriHost AI.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded-md border px-3 py-2 text-sm" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-md border px-3 py-2 text-sm" type="password" required placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={loading}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Pas encore d&apos;hôtel ? <a href="/inscription" className="text-blue-600 underline">Inscrire mon hôtel</a>
      </p>
    </main>
  );
}
