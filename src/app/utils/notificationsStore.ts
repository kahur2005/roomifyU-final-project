import type { Notification } from '../data/mockData';

const storeKey = (userId: string) => `roomify_notifs_${userId}`;

export function getNotifications(userId: string): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(storeKey(userId)) ?? '[]') as Notification[];
  } catch {
    return [];
  }
}

export function addNotification(
  userId: string,
  notif: Omit<Notification, 'id' | 'timestamp' | 'read'>,
): Notification {
  const full: Notification = {
    ...notif,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const existing = getNotifications(userId);
  localStorage.setItem(storeKey(userId), JSON.stringify([full, ...existing]));
  window.dispatchEvent(new CustomEvent('roomify:notification', { detail: full }));
  return full;
}

export function markNotificationRead(userId: string, notifId: string): void {
  const updated = getNotifications(userId).map((n) =>
    n.id === notifId ? { ...n, read: true } : n,
  );
  localStorage.setItem(storeKey(userId), JSON.stringify(updated));
}

// ── Booking-status cache (used to detect approval/rejection changes) ──────────

const statusCacheKey = (userId: string) => `roomify_booking_status_${userId}`;

export function getStatusCache(userId: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(statusCacheKey(userId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function updateStatusCache(
  userId: string,
  bookings: Array<{ id: string; status: string }>,
): Record<string, string> {
  const prev = getStatusCache(userId);
  const next: Record<string, string> = {};
  bookings.forEach((b) => { next[b.id] = b.status; });
  localStorage.setItem(statusCacheKey(userId), JSON.stringify(next));
  return prev;
}
