/**
 * Module 6 — Chambres : port de persistance.
 */
import type {
  CreateRoomInput,
  Room,
  RoomFilter,
  RoomStatus,
  RoomStatusEvent,
  UpdateRoomInput,
} from "./rooms.types.js";

export interface RoomsRepository {
  createRoom(hotelId: string, input: CreateRoomInput): Promise<Room>;
  updateRoom(hotelId: string, roomId: string, input: UpdateRoomInput): Promise<Room>;
  setRoomStatus(hotelId: string, roomId: string, status: RoomStatus, changedBy?: string): Promise<Room>;
  getRoom(hotelId: string, roomId: string): Promise<Room | null>;
  getRoomByNumber(hotelId: string, number: string): Promise<Room | null>;
  listRooms(filter: RoomFilter): Promise<{ rooms: Room[]; total: number }>;
  listRoomStatusHistory(hotelId: string, roomId: string): Promise<RoomStatusEvent[]>;
  /** Vérifie que le type de chambre appartient à l'hôtel. */
  roomTypeExists(hotelId: string, roomTypeId: string): Promise<boolean>;
}
