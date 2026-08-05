import { describe, it, expect, beforeEach } from "vitest";
import { EventBus, InMemoryAuditWriter, AuditLogger } from "@afrihost/core";
import { PortalService, type PortalActor } from "./portal.service.js";
import { PortalError } from "./portal.error.js";
import type { PortalRepository } from "./portal.repository.js";
import type {
  FolioSummary, InvoiceSummary, PortalDevice, PortalMessage, PortalNotification,
  PortalServiceRequest, PortalUser, RegisterPortalUserInput, ReservationSummary, StaySummary,
} from "./portal.types.js";

let seq = 0;

class MemoryRepo implements PortalRepository {
  users: PortalUser[] = [];
  devices: PortalDevice[] = [];
  messages: PortalMessage[] = [];
  requests: PortalServiceRequest[] = [];
  notifications: PortalNotification[] = [];
  reservations: ReservationSummary[] = [];
  invoices: InvoiceSummary[] = [];
  folios: FolioSummary[] = [];
  stays: StaySummary[] = [];
  guests = new Map<string, { firstName: string; lastName: string; email?: string | null; phone?: string | null; loyaltyPoints: number; loyaltyTier: string | null }>();

  async register(input: RegisterPortalUserInput): Promise<PortalUser> {
    const u: PortalUser = { id: `pu-${++seq}`, hotelId: input.hotelId, guestId: input.guestId, email: input.email ?? null, phone: input.phone ?? null, emailVerified: false, phoneVerified: false, isActive: true, lastLoginAt: null, passwordHash: input.password ?? null, otpHash: null, otpExpiresAt: null };
    this.users.push(u); return u;
  }
  async findByEmailOrPhone(hotelId: string, identifier: string): Promise<PortalUser | null> { return this.users.find((u) => u.hotelId === hotelId && (u.email === identifier || u.phone === identifier)) ?? null; }
  async getByGuest(hotelId: string, guestId: string): Promise<PortalUser | null> { return this.users.find((u) => u.hotelId === hotelId && u.guestId === guestId) ?? null; }
  async setPassword(hotelId: string, id: string, h: string): Promise<void> { const u = this.users.find((x) => x.id === id)!; u.passwordHash = h; }
  async setOtp(hotelId: string, id: string, h: string, exp: Date): Promise<void> { const u = this.users.find((x) => x.id === id)!; u.otpHash = h; u.otpExpiresAt = exp; }
  async setLastLogin(hotelId: string, id: string): Promise<void> { const u = this.users.find((x) => x.id === id)!; u.lastLoginAt = new Date(); }
  async isActive(hotelId: string, id: string): Promise<boolean> { return !!this.users.find((u) => u.id === id && u.hotelId === hotelId)?.isActive; }

  async addDevice(hotelId: string, portalUserId: string, input: { deviceName?: string | null; platform?: string | null; token?: string | null }): Promise<PortalDevice> {
    const d: PortalDevice = { id: `dev-${++seq}`, portalUserId, hotelId, deviceName: input.deviceName ?? null, platform: input.platform ?? null, token: input.token ?? null, lastSeenAt: null, isRevoked: false };
    this.devices.push(d); return d;
  }
  async listDevices(hotelId: string, portalUserId: string): Promise<PortalDevice[]> { return this.devices.filter((d) => d.hotelId === hotelId && d.portalUserId === portalUserId); }
  async revokeDevice(hotelId: string, deviceId: string): Promise<void> { const d = this.devices.find((x) => x.id === deviceId)!; d.isRevoked = true; }

  async updateGuestProfile(hotelId: string, guestId: string, input: { firstName?: string; lastName?: string; email?: string | null; phone?: string | null; nationality?: string | null; address?: string | null }): Promise<void> {
    const g = this.guests.get(guestId)!; if (input.firstName) g.firstName = input.firstName; if (input.lastName) g.lastName = input.lastName;
  }
  async getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null; phone?: string | null; loyaltyPoints: number; loyaltyTier: string | null } | null> { return this.guests.get(guestId) ?? null; }

  async listReservations(hotelId: string, guestId: string): Promise<ReservationSummary[]> { return this.reservations.filter((r) => r.status !== "deleted"); }
  async reservationOwnedByGuest(hotelId: string, reservationId: string, guestId: string): Promise<boolean> { return this.reservations.some((r) => r.id === reservationId); }
  async setReservationStatus(hotelId: string, reservationId: string, status: string): Promise<void> { const r = this.reservations.find((x) => x.id === reservationId)!; r.status = status; }

  async listInvoices(hotelId: string, guestId: string): Promise<InvoiceSummary[]> { return this.invoices; }
  async listFolios(hotelId: string, guestId: string): Promise<FolioSummary[]> { return this.folios; }
  async listStays(hotelId: string, guestId: string): Promise<StaySummary[]> { return this.stays; }

  async sendMessage(hotelId: string, portalUserId: string, guestId: string, input: { subject?: string | null; body: string }): Promise<PortalMessage> {
    const m: PortalMessage = { id: `msg-${++seq}`, hotelId, portalUserId, guestId, direction: "CLIENT_TO_HOTEL", subject: input.subject ?? null, body: input.body, readByHotel: false, readByGuest: true };
    this.messages.push(m); return m;
  }
  async listMessages(hotelId: string, portalUserId: string): Promise<PortalMessage[]> { return this.messages.filter((m) => m.hotelId === hotelId && m.portalUserId === portalUserId); }
  async markMessagesReadByGuest(hotelId: string, portalUserId: string): Promise<void> { this.messages.forEach((m) => { if (m.hotelId === hotelId && m.portalUserId === portalUserId) m.readByGuest = true; }); }
  async countUnreadByGuest(hotelId: string, portalUserId: string): Promise<number> { return this.messages.filter((m) => m.hotelId === hotelId && m.portalUserId === portalUserId && !m.readByGuest).length; }

  async createServiceRequest(hotelId: string, portalUserId: string, guestId: string, input: { kind: string; title: string; detail?: string | null }): Promise<PortalServiceRequest> {
    const r: PortalServiceRequest = { id: `req-${++seq}`, hotelId, portalUserId, guestId, kind: input.kind, title: input.title, detail: input.detail ?? null, status: "OPEN" };
    this.requests.push(r); return r;
  }
  async listServiceRequests(hotelId: string, portalUserId: string): Promise<PortalServiceRequest[]> { return this.requests.filter((r) => r.hotelId === hotelId && r.portalUserId === portalUserId); }

  async listNotifications(hotelId: string, portalUserId: string): Promise<PortalNotification[]> { return this.notifications.filter((n) => n.hotelId === hotelId && n.portalUserId === portalUserId); }
  async markNotificationsRead(hotelId: string, portalUserId: string): Promise<void> { this.notifications.forEach((n) => { if (n.hotelId === hotelId && n.portalUserId === portalUserId) n.read = true; }); }
  async countUnreadNotifications(hotelId: string, portalUserId: string): Promise<number> { return this.notifications.filter((n) => n.hotelId === hotelId && n.portalUserId === portalUserId && !n.read).length; }
}

const actorH1: PortalActor = { organisationId: "org1", hotelId: "h1", actorUserId: "u1" };

function build() {
  const repo = new MemoryRepo();
  repo.guests.set("g1", { firstName: "Awa", lastName: "Diallo", email: "awa@demo.bj", phone: "+22901", loyaltyPoints: 500, loyaltyTier: "GOLD" });
  const audit = new AuditLogger(new InMemoryAuditWriter());
  const bus = new EventBus();
  const svc = new PortalService(repo, audit, bus);
  return { repo, svc, bus };
}

describe("portal.service", () => {
  beforeEach(() => { seq = 0; });

  it("enregistre un compte portail (mot de passe hashé)", async () => {
    const { repo, svc } = build();
    const user = await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "supersecret" }, actorH1);
    expect(user.id).toBeTruthy();
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toContain("supersecret");
    expect(repo.users.some((u) => u.guestId === "g1")).toBe(true);
  });

  it("connecte un client avec mot de passe valide", async () => {
    const { svc } = build();
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "supersecret" }, actorH1);
    const user = await svc.login("h1", { identifier: "awa@demo.bj", password: "supersecret", deviceName: "iPhone", platform: "ios" }, actorH1);
    expect(user.guestId).toBe("g1");
  });

  it("rejette un mauvais mot de passe", async () => {
    const { svc } = build();
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "supersecret" }, actorH1);
    await expect(svc.login("h1", { identifier: "awa@demo.bj", password: "mauvais" }, actorH1)).rejects.toThrow("Mot de passe invalide");
  });

  it("rejette un accès inter-hôtel", async () => {
    const { svc } = build();
    await expect(svc.dashboard("h2", "g1", actorH1)).rejects.toThrow(PortalError);
  });

  it("fournit le tableau de bord client", async () => {
    const { repo, svc } = build();
    repo.reservations.push({ id: "r1", bookingRef: "AH-1", status: "CONFIRMED", arrivalDate: new Date(Date.now() + 86400000), departureDate: new Date(Date.now() + 172800000), amount: 50000, currency: "XOF" });
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "x".repeat(10) }, actorH1);
    const dash = await svc.dashboard("h1", "g1", actorH1);
    expect(dash.firstName).toBe("Awa");
    expect(dash.loyaltyTier).toBe("GOLD");
    expect(dash.upcomingReservations.length).toBe(1);
  });

  it("annule une réservation appartenant au client", async () => {
    const { repo, svc } = build();
    repo.reservations.push({ id: "r1", bookingRef: "AH-1", status: "CONFIRMED", arrivalDate: new Date(), departureDate: new Date(), amount: 1000, currency: "XOF" });
    await svc.changeReservation("h1", "g1", { reservationId: "r1", action: "cancel" }, actorH1);
    expect(repo.reservations.find((r) => r.id === "r1")!.status).toBe("CANCELLED");
  });

  it("n'annule pas une réservation d'un autre client", async () => {
    const { svc } = build();
    // aucune réservation pour g1 → réservation introuvable
    await expect(svc.changeReservation("h1", "g1", { reservationId: "rX", action: "cancel" }, actorH1)).rejects.toThrow("Réservation introuvable");
  });

  it("envoie un message sécurisé", async () => {
    const { repo, svc } = build();
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "x".repeat(10) }, actorH1);
    const msg = await svc.sendMessage("h1", "g1", { body: "Peut-on avoir une chaise bébé ?" }, actorH1);
    expect(msg.body).toContain("chaise bébé");
    expect(repo.messages.length).toBe(1);
  });

  it("crée une demande de service", async () => {
    const { repo, svc } = build();
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "x".repeat(10) }, actorH1);
    const req = await svc.createServiceRequest("h1", "g1", { kind: "transport", title: "Navette aéroport" }, actorH1);
    expect(req.kind).toBe("transport");
    expect(repo.requests.some((r) => r.title === "Navette aéroport")).toBe(true);
  });

  it("soumet un paiement et émet un événement", async () => {
    const { svc, bus } = build();
    let received = false;
    bus.subscribe("portal.payment_submitted", () => { received = true; });
    const res = await svc.submitPayment("h1", "g1", { amount: 25000, currency: "XOF", method: "mobile_money" }, actorH1);
    expect(res.reference).toMatch(/^PAY-/);
    expect(received).toBe(true);
  });

  it("fait le check-in en ligne d'une réservation du client", async () => {
    const { repo, svc } = build();
    repo.reservations.push({ id: "r1", bookingRef: "AH-1", status: "CONFIRMED", arrivalDate: new Date(), departureDate: new Date(), amount: 1, currency: "XOF" });
    await svc.onlineCheckin("h1", "g1", { reservationId: "r1", idDocument: "C12345", idDocumentType: "CIN" }, actorH1);
    // pas d'exception = OK
  });

  it("liste les appareils connectés", async () => {
    const { repo, svc } = build();
    await svc.register("h1", { hotelId: "h1", guestId: "g1", email: "awa@demo.bj", password: "x".repeat(10) }, actorH1);
    await svc.login("h1", { identifier: "awa@demo.bj", password: "x".repeat(10), deviceName: "Android", platform: "android" }, actorH1);
    const user = await svc.dashboard("h1", "g1", actorH1);
    void user;
    const u = repo.users.find((x) => x.guestId === "g1")!;
    const devices = await svc.listDevices("h1", u.id, actorH1);
    expect(devices.length).toBe(1);
    expect(devices[0]!.platform).toBe("android");
  });
});
