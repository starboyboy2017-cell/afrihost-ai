import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfriHost AI — PMS hôtelier multihôtel",
  description: "Plateforme SaaS de gestion hôtelière pour l'Afrique (Phase 0).",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#0f766e" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}
        {/* Portail Client (PWA) : enregistrement du service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function(){ navigator.serviceWorker.register("/sw.js"); }); }`,
          }}
        />
      </body>
    </html>
  );
}
