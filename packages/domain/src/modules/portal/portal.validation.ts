/**
 * Module 26 — Portail Client : validation (zod).
 */
import { z } from "zod";
import type {
  ChangeReservationInput,
  CreateServiceRequestInput,
  LoginInput,
  OnlineCheckinInput,
  RegisterPortalUserInput,
  RequestOtpInput,
  SendMessageInput,
  SubmitPaymentInput,
  UpdateProfileInput,
} from "./portal.types.js";

export const registerPortalUserSchema = z.object({
  hotelId: z.string().min(1),
  guestId: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").optional().nullable(),
}).strict();

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email ou téléphone requis"),
  password: z.string().optional().nullable(),
  otp: z.string().optional().nullable(),
  deviceName: z.string().trim().optional().nullable(),
  platform: z.string().trim().optional().nullable(),
}).strict();

export const requestOtpSchema = z.object({
  identifier: z.string().trim().min(1),
  channel: z.enum(["email", "sms"]),
}).strict();

export const updateProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  nationality: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
}).strict();

export const sendMessageSchema = z.object({
  subject: z.string().trim().optional().nullable(),
  body: z.string().trim().min(1, "Message requis").max(4000),
}).strict();

export const createServiceRequestSchema = z.object({
  kind: z.enum(["room_service", "transport", "maintenance", "laundry", "concierge", "other"]),
  title: z.string().trim().min(1, "Titre requis"),
  detail: z.string().trim().optional().nullable(),
}).strict();

export const changeReservationSchema = z.object({
  reservationId: z.string().min(1),
  action: z.enum(["modify", "cancel"]),
  newArrivalDate: z.string().optional().nullable(),
  newDepartureDate: z.string().optional().nullable(),
}).strict();

export const submitPaymentSchema = z.object({
  reservationId: z.string().optional().nullable(),
  folioId: z.string().optional().nullable(),
  amount: z.number().int().min(0),
  currency: z.string().trim().min(1),
  method: z.enum(["card", "mobile_money", "bank"]),
}).strict();

export const onlineCheckinSchema = z.object({
  reservationId: z.string().min(1),
  idDocument: z.string().trim().optional().nullable(),
  idDocumentType: z.string().trim().optional().nullable(),
  vehiclePlate: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
}).strict();

export function validateRegisterPortalUser(input: RegisterPortalUserInput): RegisterPortalUserInput {
  return registerPortalUserSchema.parse(input) as RegisterPortalUserInput;
}
export function validateLogin(input: LoginInput): LoginInput {
  return loginSchema.parse(input) as LoginInput;
}
export function validateRequestOtp(input: RequestOtpInput): RequestOtpInput {
  return requestOtpSchema.parse(input) as RequestOtpInput;
}
export function validateUpdateProfile(input: UpdateProfileInput): UpdateProfileInput {
  return updateProfileSchema.parse(input) as UpdateProfileInput;
}
export function validateSendMessage(input: SendMessageInput): SendMessageInput {
  return sendMessageSchema.parse(input) as SendMessageInput;
}
export function validateCreateServiceRequest(input: CreateServiceRequestInput): CreateServiceRequestInput {
  return createServiceRequestSchema.parse(input) as CreateServiceRequestInput;
}
export function validateChangeReservation(input: ChangeReservationInput): ChangeReservationInput {
  return changeReservationSchema.parse(input) as ChangeReservationInput;
}
export function validateSubmitPayment(input: SubmitPaymentInput): SubmitPaymentInput {
  return submitPaymentSchema.parse(input) as SubmitPaymentInput;
}
export function validateOnlineCheckin(input: OnlineCheckinInput): OnlineCheckinInput {
  return onlineCheckinSchema.parse(input) as OnlineCheckinInput;
}
