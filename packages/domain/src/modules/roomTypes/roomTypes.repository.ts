/**
 * Module 5 — Types de chambres & tarifs : port de persistance.
 */
import type {
  CreateRatePlanInput,
  CreateRoomTypeInput,
  RatePlan,
  RatePlanPrice,
  RatePlanRestrictionInput,
  RoomType,
  UpdateRatePlanInput,
  UpdateRoomTypeInput,
} from "./roomTypes.types.js";

export interface RoomTypesRepository {
  // Types de chambres
  createRoomType(hotelId: string, input: CreateRoomTypeInput): Promise<RoomType>;
  updateRoomType(hotelId: string, roomTypeId: string, input: UpdateRoomTypeInput): Promise<RoomType>;
  setRoomTypeActive(hotelId: string, roomTypeId: string, isActive: boolean): Promise<RoomType>;
  getRoomType(hotelId: string, roomTypeId: string): Promise<RoomType | null>;
  listRoomTypes(hotelId: string, includeInactive?: boolean): Promise<RoomType[]>;

  // Plans tarifaires
  createRatePlan(hotelId: string, input: CreateRatePlanInput): Promise<RatePlan>;
  updateRatePlan(hotelId: string, ratePlanId: string, input: UpdateRatePlanInput): Promise<RatePlan>;
  setRatePlanActive(hotelId: string, ratePlanId: string, isActive: boolean): Promise<RatePlan>;
  getRatePlan(hotelId: string, ratePlanId: string): Promise<RatePlan | null>;
  listRatePlans(hotelId: string, roomTypeId?: string): Promise<RatePlan[]>;
  /** Résout le tarif applicable (priorité aux plans saisonniers actifs, sinon baseRate). */
  resolvePrice(hotelId: string, roomTypeId: string, currency: string, date: Date): Promise<number>;

  // Prix par devise (joints aux plans)
  setRatePlanPrices(ratePlanId: string, prices: Record<string, number>): Promise<void>;
  getRatePlanPrices(ratePlanId: string): Promise<RatePlanPrice[]>;

  // Restrictions
  setRatePlanRestrictions(ratePlanId: string, restrictions?: RatePlanRestrictionInput): Promise<void>;
  getRatePlanRestrictions(ratePlanId: string): Promise<RatePlanRestrictionInput | null>;
}
