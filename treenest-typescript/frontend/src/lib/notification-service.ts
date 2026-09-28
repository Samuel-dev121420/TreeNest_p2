import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export type NotificationType =
  | "video_approved"
  | "video_rejected"
  | "study_completed"
  | "reminder_due"
  | "friend_request_received"
  | "friend_accepted"
  | "chat_received"
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
  targetAccountId?: string;
};

const STORAGE_KEY = "treenest_app_notifications";
const LISTENERS = new Set<() => void>();
const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function isNotificationForUser(
  n: AppNotification,
  uid?: string,
  accountId?: string,
  isAdmin = false,
): boolean {
  if (n.forAdminOnly) return isAdmin;

  const normalizedAccId = accountId ? accountId.trim().toUpperCase() : undefined;
  const targetAccId = n.targetAccountId ? n.targetAccountId.trim().toUpperCase() : undefined;

  // Cek kesesuaian targetAccountId
  if (targetAccId && normalizedAccId && targetAccId === normalizedAccId) {
    return true;
  }

  // Cek kesesuaian targetUid
  if (n.targetUid) {
    if (uid && n.targetUid === uid) return true;
    if (normalizedAccId) {
      if (
        n.targetUid.trim().toUpperCase() === normalizedAccId ||
        n.targetUid === `uid_${normalizedAccId}` ||
        n.targetUid.trim().toUpperCase() === `UID_${normalizedAccId}`
      ) {
        return true;
      }
    }
    return false;
  }

  // Jika targetAccountId cocok dengan uid
  if (targetAccId && uid && targetAccId === uid) {
    return true;
  }

  // Jika notifikasi global / sistem umum
  if (!n.targetUid && !n.targetAccountId && !n.forAdminOnly) {
    return true;
  }

  return false;
}

export function getStoredNotifications(
  uid?: string,
  accountId?: string,
  isAdmin = false,
): AppNotification[] {
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
    return valid.filter((n) => isNotificationForUser(n, uid, accountId, isAdmin));
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

function mergeRemoteNotifications(remoteList: AppNotification[]) {
  if (remoteList.length === 0) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const localList: AppNotification[] = raw ? JSON.parse(raw) : [];
    let hasChange = false;

    const mergedMap = new Map<string, AppNotification>();
    localList.forEach((n) => mergedMap.set(n.id, n));

    remoteList.forEach((r) => {
      const existing = mergedMap.get(r.id);
      if (!existing) {
        mergedMap.set(r.id, r);
        hasChange = true;
      } else if (existing.read !== r.read) {
        mergedMap.set(r.id, { ...existing, read: r.read });
        hasChange = true;
      }
    });

    if (hasChange) {
      const now = Date.now();
      const updated = Array.from(mergedMap.values())
        .filter((n) => now - n.timestamp <= EXPIRATION_MS)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 200);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      LISTENERS.forEach((fn) => fn());
    }
  } catch {
    // ignore
  }
}

export function subscribeNotifications(
  listener: () => void,
  uid?: string,
  accountId?: string,
  isAdmin = false,
) {
  LISTENERS.add(listener);

  // Jika Firebase aktif, subscribe secara real-time ke Firestore collection "notifications"
  let firestoreUnsub: (() => void) | null = null;
  if (isFirebaseConfigured && db) {
    try {
      const notifQuery = query(
        collection(db, "notifications"),
        orderBy("timestamp", "desc"),
        limit(60),
      );

      firestoreUnsub = onSnapshot(
        notifQuery,
        (snapshot) => {
          const remoteList: AppNotification[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AppNotification;
            const notifItem: AppNotification = {
              ...data,
              id: docSnap.id,
            };
            if (isNotificationForUser(notifItem, uid, accountId, isAdmin)) {
              remoteList.push(notifItem);
            }
          });
          mergeRemoteNotifications(remoteList);
        },
        (err) => {
          console.warn("Firestore notifications onSnapshot error:", err);
        },
      );
    } catch (err) {
      console.warn("Error setting up firestore notifications listener:", err);
    }
  }

  return () => {
    LISTENERS.delete(listener);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

export async function addNotification(
  notif: Omit<AppNotification, "id" | "timestamp" | "read">,
) {
  let all: AppNotification[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) all = JSON.parse(raw);
  } catch {
    all = [];
  }

  const now = Date.now();
  // Filter out notifications older than 7 days
  const valid = all.filter((n) => now - n.timestamp <= EXPIRATION_MS);

  // Prevent exact duplicate notifications for the same recipient within 1 minute
  const isDuplicate = valid.some(
    (n) =>
      n.type === notif.type &&
      n.title === notif.title &&
      n.message === notif.message &&
      n.targetUid === notif.targetUid &&
      n.targetAccountId === notif.targetAccountId &&
      now - n.timestamp < 60000,
  );
  if (isDuplicate) return;

  const newId = `notif_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const newItem: AppNotification = {
    ...notif,
    id: newId,
    timestamp: now,
    read: false,
  };

  const updated = [newItem, ...valid].slice(0, 200);
  saveNotifications(updated);

  // Tulis ke Firestore agar sinkron dua arah real-time antar perangkat/akun berbeda
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "notifications", newId);
      await setDoc(docRef, {
        ...newItem,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Error saving notification to Firestore:", err);
    }
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(updated);
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "notifications", id);
      await updateDoc(docRef, { read: true });
    } catch {
      // ignore
    }
  }
}

export async function removeNotification(id: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.filter((n) => n.id !== id);
      saveNotifications(updated);
    }
  } catch {
    // ignore
  }

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "notifications", id);
      await deleteDoc(docRef);
    } catch {
      // ignore
    }
  }
}

export async function clearAllNotifications(
  uid?: string,
  accountId?: string,
  isAdmin = false,
) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      // Simpan hanya notifikasi milik user lain jika ada
      const remaining = list.filter((n) => !isNotificationForUser(n, uid, accountId, isAdmin));
      saveNotifications(remaining);
    }
  } catch {
    saveNotifications([]);
  }

  if (isFirebaseConfigured && db) {
    try {
      const notifQuery = query(
        collection(db, "notifications"),
        orderBy("timestamp", "desc"),
        limit(100),
      );
      const snap = await getDocs(notifQuery);
      const deletePromises: Promise<void>[] = [];
      snap.forEach((d) => {
        const item = d.data() as AppNotification;
        if (isNotificationForUser(item, uid, accountId, isAdmin)) {
          deletePromises.push(deleteDoc(d.ref));
        }
      });
      await Promise.all(deletePromises);
    } catch {
      // ignore
    }
  }
}
