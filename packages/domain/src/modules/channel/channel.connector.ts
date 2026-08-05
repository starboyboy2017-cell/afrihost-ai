/**
 * Module 25 — Port du connecteur OTA (Connector Framework).
 *
 * Chaque OTA est un **connecteur indépendant** implémentant cette interface.
 * Le service métier ne connaît jamais une plateforme concrète : il résout le
 * connecteur par sa `otaKey` (booking, expedia, airbnb, agoda, hotelbeds...).
 * Un connecteur peut s'appuyer sur une API REST, XML, iCal, ou tout futur
 * protocole — l'application n'a pas à changer.
 *
 * Toute méthode renvoie un résultat sûr (pas de throw non géré) pour alimenter
 * la file d'attente et les politiques de retry.
 */
import type { ChannelAccount } from "./channel.types.js";

export type ConnectorResult<T = Record<string, unknown>> = {
  ok: boolean;
  data?: T;
  error?: string;
  providerRef?: string | null;
};

/** Donnée outbound normalisée pour un connecteur. */
export interface ConnectorUpdate {
  date: string; // YYYY-MM-DD
  roomTypeId: string; // id PMS (le connecteur résout le mapping)
  otaRoomId?: string | null;
  value: number; // disponibilité (rooms) ou prix (minor units)
  meta?: Record<string, unknown>;
}

export interface OtaConnector {
  /** Clé métier (booking, expedia, airbnb, agoda, hotelbeds...). */
  readonly otaKey: string;
  /** Nom d'affichage. */
  readonly label: string;

  /** Vérifie la connexion avec les credentials du compte. */
  testConnection(account: ChannelAccount): Promise<ConnectorResult>;

  /** Pousse la disponibilité. */
  pushAvailability(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult>;

  /** Pousse les tarifs. */
  pushRates(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult>;

  /** Pousse les restrictions. */
  pushRestrictions(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult>;

  /** Pull des réservations / modifications / annulations. */
  pullBookings(account: ChannelAccount, since?: Date): Promise<ConnectorResult<unknown[]>>;
}

/** Registre des connecteurs par otaKey (résolu dans l'infra). */
export type ConnectorRegistry = Record<string, OtaConnector>;
