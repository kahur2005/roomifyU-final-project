import type { Booking } from '../data/mockData';
export type { Booking };
import { authService } from './auth';
import { gasPost } from './gasClient';

export function bookingsApiReady(): boolean {
  return authService.gasBackendConfigured() && authService.isGasSession();
}

function coerceBooking(raw: Record<string, unknown>): Booking | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? '');
  if (!id) return null;
  const equip = raw.equipment;
  const equipment = Array.isArray(equip) ? (equip as string[]) : [];
  const statusRaw = String(raw.status ?? '').toLowerCase();
  const status =
    statusRaw === 'confirmed' ||
    statusRaw === 'pending' ||
    statusRaw === 'rejected' ||
    statusRaw === 'cancelled'
      ? statusRaw
      : 'pending';
  return {
    id,
    roomId: String(raw.roomId ?? ''),
    userId: String(raw.userId ?? ''),
    userName: String(raw.userName ?? ''),
    roomName: String(raw.roomName ?? ''),
    building: String(raw.building ?? ''),
    date: String(raw.date ?? ''),
    startTime: String(raw.startTime ?? ''),
    endTime: String(raw.endTime ?? ''),
    purpose: String(raw.purpose ?? ''),
    attendees: Number(raw.attendees) || 0,
    status,
    equipment,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    isRecurring:
      typeof raw.isRecurring === 'boolean'
        ? raw.isRecurring
        : String(raw.isRecurring).toUpperCase() === 'TRUE',
    graphEventId:
      raw.graphEventId !== undefined && String(raw.graphEventId).trim()
        ? String(raw.graphEventId)
        : undefined,
    rejectReason:
      raw.rejectReason !== undefined && String(raw.rejectReason).trim()
        ? String(raw.rejectReason)
        : undefined,
  };
}

/** List bookings visible to this session (admins see all; others own rows only). */
export async function bookingsListRemote(): Promise<Booking[]> {
  const token = authService.getSessionToken();
  if (!token) return [];
  const out = await gasPost({ action: 'bookingsList', token });
  if (!out.ok) return [];
  const list = out.bookings;
  if (!Array.isArray(list)) return [];
  return list.map((item) => coerceBooking(item as Record<string, unknown>)).filter(Boolean) as Booking[];
}

export type BookingCreatePayload = Pick<
  Booking,
  | 'roomId'
  | 'roomName'
  | 'building'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'purpose'
  | 'attendees'
  | 'equipment'
  | 'isRecurring'
> & {
  notes?: string;
};

export async function bookingCreateRemote(input: BookingCreatePayload): Promise<Booking | null> {
  const token = authService.getSessionToken();
  if (!token) return null;
  const out = await gasPost({
    action: 'bookingCreate',
    token,
    roomId: input.roomId,
    roomName: input.roomName,
    building: input.building,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    purpose: input.purpose,
    attendees: input.attendees,
    equipment: input.equipment,
    notes: input.notes ?? '',
    isRecurring: input.isRecurring,
  });
  if (!out.ok || !out.booking) return null;
  return coerceBooking(out.booking as Record<string, unknown>);
}

export type BookingApproveOutcome =
  | { success: true; booking: Booking; graphEventId: string }
  | { success: false; error?: string; message?: string };

export async function bookingApproveRemote(bookingId: string): Promise<BookingApproveOutcome> {
  const token = authService.getSessionToken();
  if (!token) return { success: false, error: 'NO_SESSION' };
  const body: Record<string, unknown> = {
    action: 'bookingApprove',
    token,
    bookingId,
  };
  const out = await gasPost(body);
  if (!out.ok) {
    const err = typeof out.error === 'string' ? out.error : 'BOOKING_APPROVE_FAILED';
    const msg = typeof out.message === 'string' ? out.message : undefined;
    return { success: false, error: err, message: msg };
  }
  if (!out.booking) return { success: false, error: 'NO_BOOKING' };
  const booking = coerceBooking(out.booking as Record<string, unknown>);
  if (!booking) return { success: false, error: 'BAD_BOOKING_PAYLOAD' };
  const gid = out.graphEventId != null ? String(out.graphEventId) : '';
  return { success: true, booking, graphEventId: gid };
}

export async function bookingRejectRemote(bookingId: string, rejectReason: string): Promise<Booking | null> {
  const token = authService.getSessionToken();
  if (!token) return null;
  const out = await gasPost({
    action: 'bookingReject',
    token,
    bookingId,
    rejectReason,
  });
  if (!out.ok || !out.booking) return null;
  return coerceBooking(out.booking as Record<string, unknown>);
}
