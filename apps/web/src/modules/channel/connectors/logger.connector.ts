/**
 * Module 25 — Connecteur OTA de démonstration (Connector Framework).
 *
 * Chaque OTA est un connecteur indépendant implémentant le port `OtaConnector`.
 * En production, des connecteurs Booking / Expedia / Airbnb / Agoda / Hotelbeds
 * (via API REST, XML ou iCal) implémenteraient exactement la même interface —
 * l'application n'est jamais modifiée.
 *
 * Ici : journalise les échanges et renvoie un succès simulé (démo hors-ligne).
 */
import type { ChannelAccount, ConnectorResult, ConnectorUpdate, OtaConnector } from "@afrihost/domain";

export class LoggerConnector implements OtaConnector {
  readonly otaKey: string;
  readonly label: string;

  constructor(otaKey: string, label: string) {
    this.otaKey = otaKey;
    this.label = label;
  }

  async testConnection(account: ChannelAccount): Promise<ConnectorResult> {
    // eslint-disable-next-line no-console
    console.log(`[channel:${this.otaKey}] test connexion ${account.name}`);
    return { ok: true, data: { status: "ok" } };
  }

  async pushAvailability(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult> {
    // eslint-disable-next-line no-console
    console.log(`[channel:${this.otaKey}] push disponibilité ${account.name} : ${updates.length} jour(s)`);
    return { ok: true, data: { pushed: updates.length } };
  }

  async pushRates(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult> {
    // eslint-disable-next-line no-console
    console.log(`[channel:${this.otaKey}] push tarifs ${account.name} : ${updates.length} entrée(s)`);
    return { ok: true, data: { pushed: updates.length } };
  }

  async pushRestrictions(account: ChannelAccount, updates: ConnectorUpdate[]): Promise<ConnectorResult> {
    // eslint-disable-next-line no-console
    console.log(`[channel:${this.otaKey}] push restrictions ${account.name} : ${updates.length} jour(s)`);
    return { ok: true, data: { pushed: updates.length } };
  }

  async pullBookings(account: ChannelAccount): Promise<ConnectorResult<unknown[]>> {
    // eslint-disable-next-line no-console
    console.log(`[channel:${this.otaKey}] pull réservations ${account.name}`);
    return { ok: true, data: [] };
  }
}
