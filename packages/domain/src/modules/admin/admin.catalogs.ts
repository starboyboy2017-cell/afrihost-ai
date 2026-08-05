/**
 * Module 29 — Catalogues de référence (devises, langues, fuseaux).
 * Sources statiques du domaine, extensibles.
 */
import type { CurrencyInfo, LanguageInfo, TimezoneInfo } from "./admin.types.js";

export const CURRENCIES: CurrencyInfo[] = [
  { code: "XOF", name: "Franc CFA Ouest (BCEAO)", symbol: "FCFA" },
  { code: "XAF", name: "Franc CFA Centre (BEAC)", symbol: "FCFA" },
  { code: "NGN", name: "Naira", symbol: "₦" },
  { code: "GHS", name: "Cedi", symbol: "₵" },
  { code: "KES", name: "Shilling kényan", symbol: "KSh" },
  { code: "ZAR", name: "Rand", symbol: "R" },
  { code: "MAD", name: "Dirham marocain", symbol: "DH" },
  { code: "TND", name: "Dinar tunisien", symbol: "DT" },
  { code: "EGP", name: "Livre égyptienne", symbol: "E£" },
  { code: "USD", name: "Dollar américain", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Livre sterling", symbol: "£" },
];

export const LANGUAGES: LanguageInfo[] = [
  { code: "fr", name: "Français" },
  { code: "fr-BJ", name: "Français (Bénin)" },
  { code: "en", name: "English" },
  { code: "en-GB", name: "English (UK)" },
  { code: "pt", name: "Português" },
  { code: "ar", name: "العربية" },
  { code: "sw", name: "Kiswahili" },
  { code: "yo", name: "Yorùbá" },
  { code: "wo", name: "Wolof" },
  { code: "ha", name: "Hausa" },
];

export const TIMEZONES: TimezoneInfo[] = [
  { id: "Africa/Porto-Novo", label: "Africa/Porto-Novo (UTC+1)" },
  { id: "Africa/Lagos", label: "Africa/Lagos (UTC+1)" },
  { id: "Africa/Abidjan", label: "Africa/Abidjan (UTC+0)" },
  { id: "Africa/Accra", label: "Africa/Accra (UTC+0)" },
  { id: "Africa/Dakar", label: "Africa/Dakar (UTC+0)" },
  { id: "Africa/Casablanca", label: "Africa/Casablanca (UTC+1)" },
  { id: "Africa/Cairo", label: "Africa/Cairo (UTC+2)" },
  { id: "Africa/Nairobi", label: "Africa/Nairobi (UTC+3)" },
  { id: "Africa/Johannesburg", label: "Africa/Johannesburg (UTC+2)" },
  { id: "Europe/Paris", label: "Europe/Paris (UTC+1)" },
  { id: "UTC", label: "UTC" },
];
