import { rooms } from '../data/mockData';
import type { Booking } from '../data/mockData';
export type { Booking };
import { authService } from './auth';
import { gasPost } from './gasClient';

export function bookingsApiReady(): boolean {
  return authService.gasBackendConfigured() && authService.isGasSession();
}

// Google Sheets stores times as fractions of Dec 30, 1899 — GAS returns those
// as full date-time strings. These helpers normalise back to plain HH:mm / YYYY-MM-DD.
function normalizeTimeStr(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return s;
}

function normalizeDateStr(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return s;
}

function coerceBooking(raw: Record<string, unknown>): Booking | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? raw.row ?? raw.rowNum ?? '');
  if (!id) return null;

  const rawRoom = String(raw.room ?? '').trim();
  const rawRoomName = String(raw.roomName ?? rawRoom).trim();
  const roomFromId = rooms.find((room) => room.id === rawRoom);
  const roomFromName = rooms.find((room) => room.name === rawRoomName);
  const roomObject = roomFromId || roomFromName;

  const roomId = roomObject ? roomObject.id : rawRoom || rawRoomName;
  const roomName = roomObject ? roomObject.name : rawRoomName || rawRoom;
  const building = String(raw.building ?? roomObject?.building ?? '');
  const userName = String(raw.name ?? raw.userName ?? '');

  const equipments = raw.equipments
    ? String(raw.equipments)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : Array.isArray(raw.equipment)
    ? (raw.equipment as string[])
    : [];

  const statusRaw = String(raw.status ?? '').toLowerCase();
  const status =
    statusRaw === 'confirmed' ||
    statusRaw === 'approved' ||
    statusRaw === 'pending' ||
    statusRaw === 'rejected' ||
    statusRaw === 'cancelled'
      ? statusRaw === 'approved'
        ? 'confirmed'
        : statusRaw
      : 'pending';

  return {
    id,
    roomId,
    userId: String(raw.userId ?? ''),
    userName,
    roomName,
    building,
    date: normalizeDateStr(raw.date),
    startTime: normalizeTimeStr(raw.time_start ?? raw.startTime),
    endTime: normalizeTimeStr(raw.time_end ?? raw.endTime),
    purpose: String(raw.purpose ?? ''),
    attendees: Number(raw.num_attend ?? raw.attendees) || 0,
    status,
    equipment: equipments,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    isRecurring:
      typeof raw.isRecurring === 'boolean'
        ? raw.isRecurring
        : String(raw.isRecurring).toUpperCase() === 'TRUE',
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

export type AvailabilitySlot = {
  time: string;
  status: 'available' | 'booked' | 'pending';
};

export async function getRoomAvailabilityRemote(
  roomId: string,
  date: string,
): Promise<AvailabilitySlot[]> {
  const token = authService.getSessionToken();
  if (!token) return [];
  const out = await gasPost({
    action: 'getRoomAvailability',
    token,
    roomId,
    date,
  });
  if (!out.ok) return [];
  const availability = Array.isArray(out.availability) ? out.availability : [];
  return availability
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const status = String((item as Record<string, unknown>).status ?? 'available').toLowerCase();
      if (status !== 'available' && status !== 'booked' && status !== 'pending') return null;
      return {
        time: String((item as Record<string, unknown>).time ?? ''),
        status: status as AvailabilitySlot['status'],
      };
    })
    .filter(Boolean) as AvailabilitySlot[];
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
  // Pass name explicitly so the stored value always matches currentUser.name.
  const currentUser = authService.getCurrentUser();
  const out = await gasPost({
    action: 'bookingCreate',
    token,
    name: currentUser?.name ?? '',
    room: input.roomId,
    roomName: input.roomName,
    building: input.building,
    date: input.date,
    time_start: input.startTime,
    time_end: input.endTime,
    purpose: input.purpose,
    num_attend: input.attendees,
    equipments: input.equipment,
    notes: input.notes ?? '',
    isRecurring: input.isRecurring,
  });
  if (!out.ok || !out.booking) return null;
  return coerceBooking(out.booking as Record<string, unknown>);
}

export type BookingApproveOutcome =
  | { success: true; booking: Booking }
  | { success: false; error?: string; message?: string };

export async function bookingApproveRemote(bookingId: string): Promise<BookingApproveOutcome> {
  const token = authService.getSessionToken();
  if (!token) return { success: false, error: 'NO_SESSION' };
  const body: Record<string, unknown> = {
    action: 'bookingApprove',
    token,
    rowNum: Number(bookingId),
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
  return { success: true, booking };
}

export async function bookingRejectRemote(bookingId: string, rejectReason: string): Promise<Booking | null> {
  const token = authService.getSessionToken();
  if (!token) return null;
  const out = await gasPost({
    action: 'bookingReject',
    token,
    rowNum: Number(bookingId),
    rejectReason,
  });
  if (!out.ok || !out.booking) return null;
  return coerceBooking(out.booking as Record<string, unknown>);
}
