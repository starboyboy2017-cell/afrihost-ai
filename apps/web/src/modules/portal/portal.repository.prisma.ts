/**
 * Module 26 — Portail Client : adapter Prisma.
 * Données agrégées du client (réservations, factures, folios, séjours, fidélité)
 * déjà filtrées par hôtel.
 */
import type {
  PortalRepository,
  FolioSummary,
  InvoiceSummary,
  PortalDevice,
  PortalMessage,
  PortalNotification,
  PortalServiceRequest,
  PortalUser,
  RegisterPortalUserInput,
  ReservationSummary,
  StaySummary,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaPortalRepository implements PortalRepository {
  async register(input: RegisterPortalUserInput): Promise<PortalUser> {
    const u = await prisma.portalUser.create({ data: { hotelId: input.hotelId, guestId: input.guestId, email: input.email ?? null, phone: input.phone ?? null, passwordHash: input.password ?? null } });
    return this.mapUser(u);
  }
  async findByEmailOrPhone(hotelId: string, identifier: string): Promise<PortalUser | null> {
    const u = await prisma.portalUser.findFirst({ where: { hotelId, OR: [{ email: identifier }, { phone: identifier }] } });
    return u ? this.mapUser(u) : null;
  }
  async getByGuest(hotelId: string, guestId: string): Promise<PortalUser | null> {
    const u = await prisma.portalUser.findFirst({ where: { hotelId, guestId } });
    return u ? this.mapUser(u) : null;
  }
  async setPassword(hotelId: string, id: string, passwordHash: string): Promise<void> {
    await prisma.portalUser.update({ where: { id }, data: { passwordHash } });
  }
  async setOtp(hotelId: string, id: string, otpHash: string, expiresAt: Date): Promise<void> {
    await prisma.portalUser.update({ where: { id }, data: { otpHash, otpExpiresAt: expiresAt } });
  }
  async setLastLogin(hotelId: string, id: string): Promise<void> {
    await prisma.portalUser.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
  async isActive(hotelId: string, id: string): Promise<boolean> {
    const u = await prisma.portalUser.findFirst({ where: { id, hotelId } });
    return u?.isActive ?? false;
  }

  async addDevice(hotelId: string, portalUserId: string, input: { deviceName?: string | null; platform?: string | null; token?: string | null }): Promise<PortalDevice> {
    const d = await prisma.portalDevice.create({ data: { hotelId, portalUserId, deviceName: input.deviceName ?? null, platform: input.platform ?? null, token: input.token ?? null } });
    return { id: d.id, portalUserId: d.portalUserId, hotelId: d.hotelId, deviceName: d.deviceName, platform: d.platform, token: d.token, lastSeenAt: d.lastSeenAt, isRevoked: d.isRevoked };
  }
  async listDevices(hotelId: string, portalUserId: string): Promise<PortalDevice[]> {
    const rows = await prisma.portalDevice.findMany({ where: { hotelId, portalUserId, isRevoked: false }, orderBy: { createdAt: "desc" } });
    return rows.map((d) => ({ id: d.id, portalUserId: d.portalUserId, hotelId: d.hotelId, deviceName: d.deviceName, platform: d.platform, token: d.token, lastSeenAt: d.lastSeenAt, isRevoked: d.isRevoked }));
  }
  async revokeDevice(hotelId: string, deviceId: string): Promise<void> {
    await prisma.portalDevice.update({ where: { id: deviceId, hotelId }, data: { isRevoked: true } });
  }

  async updateGuestProfile(hotelId: string, guestId: string, input: { firstName?: string; lastName?: string; email?: string | null; phone?: string | null; nationality?: string | null; address?: string | null }): Promise<void> {
    await prisma.guest.update({ where: { id: guestId }, data: { firstName: input.firstName, lastName: input.lastName, email: input.email ?? undefined, phone: input.phone ?? undefined, nationality: input.nationality ?? undefined, address: input.address ?? undefined } });
  }
  async getGuestName(hotelId: string, guestId: string): Promise<{ firstName: string; lastName: string; email?: string | null; phone?: string | null; loyaltyPoints: number; loyaltyTier: string | null } | null> {
    const g = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return g ? { firstName: g.firstName, lastName: g.lastName, email: g.email, phone: g.phone, loyaltyPoints: g.loyaltyPoints, loyaltyTier: g.loyaltyTier } : null;
  }

  async listReservations(hotelId: string, guestId: string): Promise<ReservationSummary[]> {
    const rows = await prisma.reservation.findMany({ where: { hotelId, guestId, deletedAt: null }, include: { room: { include: { roomType: { select: { name: true } } } } }, orderBy: { arrivalDate: "desc" } });
    return rows.map((r) => ({ id: r.id, bookingRef: r.bookingRef, status: r.status, arrivalDate: r.arrivalDate, departureDate: r.departureDate, amount: r.amount, currency: r.currency, roomTypeName: r.room?.roomType?.name ?? null }));
  }
  async reservationOwnedByGuest(hotelId: string, reservationId: string, guestId: string): Promise<boolean> {
    const r = await prisma.reservation.findFirst({ where: { id: reservationId, hotelId, guestId, deletedAt: null } });
    return r !== null;
  }
  async setReservationStatus(hotelId: string, reservationId: string, status: string): Promise<void> {
    await prisma.reservation.updateMany({ where: { id: reservationId, hotelId }, data: { status: status as never } });
  }

  async listInvoices(hotelId: string, guestId: string): Promise<InvoiceSummary[]> {
    const rows = await prisma.invoice.findMany({ where: { hotelId, guestId }, orderBy: { issuedAt: "desc" } });
    return rows.map((i) => ({ id: i.id, number: i.number ?? null, status: i.status, total: i.total, currency: i.currency, issuedAt: i.issuedAt }));
  }
  async listFolios(hotelId: string, guestId: string): Promise<FolioSummary[]> {
    const rows = await prisma.folio.findMany({ where: { hotelId, guestId }, include: { lines: { where: { voided: false }, select: { amount: true } } }, orderBy: { createdAt: "desc" } });
    return rows.map((f) => ({ id: f.id, status: f.status, balance: f.lines.reduce((s, l) => s + l.amount, 0), currency: f.currency }));
  }
  async listStays(hotelId: string, guestId: string): Promise<StaySummary[]> {
    const rows = await prisma.stay.findMany({ where: { hotelId, guestId }, include: { room: { select: { number: true } } }, orderBy: { checkInAt: "desc" } });
    return rows.map((s) => ({ id: s.id, checkIn: s.checkInAt ?? null, checkOut: s.checkOutAt ?? null, status: s.status, roomName: s.room?.number ?? null, charges: 0, currency: "XOF" }));
  }

  async sendMessage(hotelId: string, portalUserId: string, guestId: string, input: { subject?: string | null; body: string }): Promise<PortalMessage> {
    const m = await prisma.portalMessage.create({ data: { hotelId, portalUserId, guestId, direction: "CLIENT_TO_HOTEL", subject: input.subject ?? null, body: input.body, readByGuest: true } });
    return this.mapMessage(m);
  }
  async listMessages(hotelId: string, portalUserId: string): Promise<PortalMessage[]> {
    const rows = await prisma.portalMessage.findMany({ where: { hotelId, portalUserId }, orderBy: { createdAt: "desc" } });
    return rows.map((m) => this.mapMessage(m));
  }
  async markMessagesReadByGuest(hotelId: string, portalUserId: string): Promise<void> {
    await prisma.portalMessage.updateMany({ where: { hotelId, portalUserId }, data: { readByGuest: true } });
  }
  async countUnreadByGuest(hotelId: string, portalUserId: string): Promise<number> {
    return prisma.portalMessage.count({ where: { hotelId, portalUserId, readByGuest: false } });
  }

  async createServiceRequest(hotelId: string, portalUserId: string, guestId: string, input: { kind: string; title: string; detail?: string | null }): Promise<PortalServiceRequest> {
    const r = await prisma.portalServiceRequest.create({ data: { hotelId, portalUserId, guestId, kind: input.kind, title: input.title, detail: input.detail ?? null } });
    return { id: r.id, hotelId: r.hotelId, portalUserId: r.portalUserId, guestId: r.guestId, kind: r.kind, title: r.title, detail: r.detail, status: r.status };
  }
  async listServiceRequests(hotelId: string, portalUserId: string): Promise<PortalServiceRequest[]> {
    const rows = await prisma.portalServiceRequest.findMany({ where: { hotelId, portalUserId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({ id: r.id, hotelId: r.hotelId, portalUserId: r.portalUserId, guestId: r.guestId, kind: r.kind, title: r.title, detail: r.detail, status: r.status }));
  }

  async listNotifications(hotelId: string, portalUserId: string): Promise<PortalNotification[]> {
    const rows = await prisma.portalNotification.findMany({ where: { hotelId, portalUserId }, orderBy: { createdAt: "desc" } });
    return rows.map((n) => ({ id: n.id, hotelId: n.hotelId, portalUserId: n.portalUserId, guestId: n.guestId, kind: n.kind, title: n.title, body: n.body, link: n.link, read: n.read }));
  }
  async markNotificationsRead(hotelId: string, portalUserId: string): Promise<void> {
    await prisma.portalNotification.updateMany({ where: { hotelId, portalUserId }, data: { read: true } });
  }
  async countUnreadNotifications(hotelId: string, portalUserId: string): Promise<number> {
    return prisma.portalNotification.count({ where: { hotelId, portalUserId, read: false } });
  }

  private mapUser(u: { id: string; hotelId: string; guestId: string; email: string | null; phone: string | null; emailVerified: boolean; phoneVerified: boolean; isActive: boolean; lastLoginAt: Date | null; passwordHash: string | null; otpHash: string | null; otpExpiresAt: Date | null }): PortalUser {
    return { id: u.id, hotelId: u.hotelId, guestId: u.guestId, email: u.email, phone: u.phone, emailVerified: u.emailVerified, phoneVerified: u.phoneVerified, isActive: u.isActive, lastLoginAt: u.lastLoginAt, passwordHash: u.passwordHash, otpHash: u.otpHash, otpExpiresAt: u.otpExpiresAt };
  }
  private mapMessage(m: { id: string; hotelId: string; portalUserId: string; guestId: string; direction: string; subject: string | null; body: string; readByHotel: boolean; readByGuest: boolean }): PortalMessage {
    return { id: m.id, hotelId: m.hotelId, portalUserId: m.portalUserId, guestId: m.guestId, direction: m.direction, subject: m.subject, body: m.body, readByHotel: m.readByHotel, readByGuest: m.readByGuest };
  }
}
