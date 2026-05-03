import { authService } from './auth';
import { gasPost } from './gasClient';

export type AvailabilitySlot = {
  time: string;
  status: 'available' | 'booked' | 'pending';
};

export type CalendarAvailabilityResult = {
  slots: AvailabilitySlot[];
  graphEnabled: boolean;
  graphReadError?: string;
};

/** Half-hour slots for one room/date; merges Microsoft Graph calendarView with Sheet bookings (pending/confirmed). */
export async function calendarAvailabilityRemote(
  roomId: string,
  date: string,
): Promise<CalendarAvailabilityResult | null> {
  const token = authService.getSessionToken();
  if (!token) return null;
  const out = await gasPost({
    action: 'calendarAvailability',
    token,
    roomId,
    date,
  });
  if (!out.ok || !Array.isArray(out.slots)) return null;
  const slots = (out.slots as unknown[]).map((row) => {
    const rec = row as Record<string, unknown>;
    const t = String(rec.time ?? '');
    const s = String(rec.status ?? '').toLowerCase();
    const status =
      s === 'booked' || s === 'pending' || s === 'available' ? s : ('available' as const);
    return { time: t, status };
  }) as AvailabilitySlot[];
  const graphEnabled = out.graphEnabled === true;
  const graphReadError = typeof out.graphReadError === 'string' ? out.graphReadError : undefined;
  return { slots, graphEnabled, graphReadError };
}
