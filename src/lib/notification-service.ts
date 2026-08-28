export type NotificationType =
  | "video_approved"
  | "video_rejected"
  | "study_completed"
  | "reminder_due"
  | "friend_request_received"
  | "friend_accepted"
  | "admin_video_pending";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link: string;
  forAdminOnly?: boolean;
  targetUid?: string;
};

const STORAGE_KEY = "treenest_app_notifications";
const LISTENERS = new Set<() => void>();
const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function getStoredNotifications(uid?: string, isAdmin = false): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: AppNotification[] = JSON.parse(raw);
    const now = Date.now();

    // Clear notifications older than 7 days
    const valid = list.filter((n) => now - n.timestamp <= EXPIRATION_MS);
    if (valid.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }

    // Filter by role / recipient
    return valid.filter((n) => {
      if (n.forAdminOnly) return isAdmin;
      if (n.targetUid) return n.targetUid === uid;
      return true;
    });
  } catch {
    return [];
  }
}

function saveNotifications(list: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  LISTENERS.forEach((fn) => fn());
}

export function subscribeNotifications(listener: () => void) {
  LISTENERS.add(listener);
  return () => {
    LISTENERS.delete(listener);
  };
}

export function addNotification(
  notif: Omit<AppNotification, "id" | "timestamp" | "read">,
) {
  const current = getStoredNotifications();
  // Prevent exact duplicate notifications within 1 minute
  const isDuplicate = current.some(
    (n) =>
      n.type === notif.type &&
      n.title === notif.title &&
      n.message === notif.message &&
      Date.now() - n.timestamp < 60000,
  );
  if (isDuplicate) return;

  const newItem: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    read: false,
  };

  const updated = [newItem, ...current].slice(0, 100);
  saveNotifications(updated);
}

export function markNotificationAsRead(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const list: AppNotification[] = JSON.parse(raw);
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  } catch {
    // ignore
  }
}

export function removeNotification(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const list: AppNotification[] = JSON.parse(raw);
    const updated = list.filter((n) => n.id !== id);
    saveNotifications(updated);
  } catch {
    // ignore
  }
}

export function clearAllNotifications() {
  saveNotifications([]);
}
