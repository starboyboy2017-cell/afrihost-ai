/**
 * Module 12 — Transport : port de persistance.
 */
import type {
  CreateDriverInput,
  CreateTransferInput,
  CreateVehicleInput,
  Driver,
  Transfer,
  TransferFilter,
  TransferStatus,
  Vehicle,
} from "./transport.types.js";

export interface TransportRepository {
  // Véhicules
  createVehicle(hotelId: string, input: CreateVehicleInput): Promise<Vehicle>;
  getVehicle(hotelId: string, vehicleId: string): Promise<Vehicle | null>;
  setVehicleStatus(hotelId: string, vehicleId: string, status: Vehicle["status"]): Promise<Vehicle>;
  listVehicles(hotelId: string): Promise<Vehicle[]>;
  vehicleExists(hotelId: string, vehicleId: string): Promise<boolean>;

  // Chauffeurs
  createDriver(hotelId: string, input: CreateDriverInput): Promise<Driver>;
  listDrivers(hotelId: string): Promise<Driver[]>;
  driverExists(hotelId: string, driverId: string): Promise<boolean>;

  // Transferts
  createTransfer(hotelId: string, input: CreateTransferInput, transferRef: string): Promise<Transfer>;
  getTransfer(hotelId: string, transferId: string): Promise<Transfer | null>;
  setTransferStatus(hotelId: string, transferId: string, status: TransferStatus, changedBy?: string): Promise<Transfer>;
  markTransferInvoiced(hotelId: string, transferId: string): Promise<Transfer>;
  listTransfers(filter: TransferFilter): Promise<{ transfers: Transfer[]; total: number }>;

  // Affectations
  assign(hotelId: string, transferId: string, vehicleId: string, driverId: string, createdBy?: string): Promise<void>;
  getAssignment(hotelId: string, transferId: string): Promise<{ vehicleId: string; driverId: string } | null>;

  /** Génère une référence de transfert unique. */
  nextTransferRef(): Promise<string>;
}
