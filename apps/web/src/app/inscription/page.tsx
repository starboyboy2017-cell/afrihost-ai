"use client";
/**
 * Page d'inscription d'un nouvel hôtel.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ organisationName: "", hotelName: "", city: "", country: "", email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Inscription échouée"); return; }
      router.push("/");
      router.refresh();
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  }

  const input = "w-full rounded-md border px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">Inscrire mon hôtel</h1>
      <p className="mt-1 text-sm text-gray-500">Créez votre établissement et commencez à utiliser le PMS AfriHost AI.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={input} required placeholder="Nom de l'organisation" value={form.organisationName} onChange={set("organisationName")} />
          <input className={input} required placeholder="Nom de l'hôtel" value={form.hotelName} onChange={set("hotelName")} />
          <input className={input} placeholder="Ville" value={form.city} onChange={set("city")} />
          <input className={input} placeholder="Pays (ISO, ex: BJ)" value={form.country} onChange={set("country")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={input} required placeholder="Prénom" value={form.firstName} onChange={set("firstName")} />
          <input className={input} required placeholder="Nom" value={form.lastName} onChange={set("lastName")} />
        </div>
        <input className={input} required type="email" placeholder="Email (connexion)" value={form.email} onChange={set("email")} />
        <input className={input} required type="password" placeholder="Mot de passe (8+ caractères)" value={form.password} onChange={set("password")} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={loading}>
          {loading ? "Création…" : "Créer mon hôtel"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Déjà inscrit ? <a href="/connexion" className="text-blue-600 underline">Se connecter</a>
      </p>
    </main>
  );
}
