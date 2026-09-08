import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  deleteDoc,
  addDoc,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import {
  seedProfile,
  type Profile,
  type Friend,
  type FriendRequest,
  type SentRequest,
  type GalleryVideo,
  type GalleryVideoSource,
  fetchTikTokThumbnail,
} from "./social";
import { generateId } from "./grow-tools";
import { deleteVideoBlob } from "./video-storage";
import { addNotification } from "./notification-service";

/** Cek apakah email adalah admin yang dikonfigurasi via VITE_ADMIN_EMAIL */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmail = import.meta.env["VITE_ADMIN_EMAIL"] as string | undefined;
  if (!adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

export type UserRole = "user" | "admin";

export type UserProfile = Profile & {
  uid: string;
  role: UserRole;
  featuredFriends: string[];
  isOnline?: boolean;
  lastOnline?: number | null;
  lastSeen?: number | null;
  isSuspended?: boolean;
  suspendReason?: string;
  suspendedAt?: number | null;
  suspendedBy?: string | null;
  notes?: string;
};

/** Membuat ID Akun unik format TN-XXXX */
export function generateAccountId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TN-${num}`;
}

/* ------------------------------------------------------------------ */
/* User Profile Service                                               */
/* ------------------------------------------------------------------ */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;

  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      const data = JSON.parse(local) as UserProfile;
      if (data.role === "admin" || uid === "admin-demo-id" || (data.email && isAdminEmail(data.email))) {
        data.role = "admin";
        data.level = 20;
        data.exp = 50;
      }
      return data;
    }
    const initial = seedProfile();
    const isAdmin = uid === "admin-demo-id";
    const mockUser: UserProfile = {
      ...initial,
      uid,
      role: isAdmin ? "admin" : "user",
      level: isAdmin ? 20 : initial.level,
      exp: isAdmin ? 50 : initial.exp,
      featuredFriends: [],
    };
    return mockUser;
  }

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      if (data.email && isAdminEmail(data.email) && data.role !== "admin") {
        data.role = "admin";
      }
      if (data.role === "admin") {
        data.level = 20;
        data.exp = 50;
      }
      // Simpan salinan ke cache lokal agar tidak pernah hilang saat network blip / tab switch
      try {
        localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
      } catch {
        // ignore
      }
      return data;
    }

    // Jika document belum ada di Firestore, periksa cache lokal sebelum return null
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      try {
        const cached = JSON.parse(local) as UserProfile;
        if (cached.email && isAdminEmail(cached.email) && cached.role !== "admin") {
          cached.role = "admin";
        }
        if (cached.role === "admin") {
          cached.level = 20;
          cached.exp = 50;
        }
        return cached;
      } catch {
        // ignore
      }
    }
    return null;
  } catch (err) {
    console.warn("Network / Firestore issue fetching user profile, using local cache fallback:", err);
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      try {
        const cached = JSON.parse(local) as UserProfile;
        if (cached.email && isAdminEmail(cached.email) && cached.role !== "admin") {
          cached.role = "admin";
        }
        if (cached.role === "admin") {
          cached.level = 20;
          cached.exp = 50;
        }
        return cached;
      } catch {
        // ignore
      }
    }
    return null;
  }
}

/** Cek apakah user sedang aktif/online dengan toleransi threshold heartbeat (90 detik untuk mendukung background tab) */
export function isUserOnline(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (!profile.isOnline) return false;
  const lastActive = profile.lastSeen || profile.lastOnline;
  if (!lastActive) return true;
  // Jika ping/aktifitas terakhir melebihi 90 detik yang lalu, user dianggap offline
  return Date.now() - lastActive < 90_000;
}

/** Mengirimkan heartbeat ping ringan untuk memperbarui timestamp kehadiran */
export async function pingPresence(uid: string): Promise<void> {
  if (!uid || !isFirebaseConfigured || !db) return;
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      isOnline: true,
      lastSeen: Date.now(),
    });
  } catch {
    // Abaikan kegagalan ping periodik
  }
}

export async function updateOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  if (!uid || !isFirebaseConfigured || !db) return;
  try {
    const userRef = doc(db, "users", uid);
    const now = Date.now();
    await updateDoc(userRef, {
      isOnline,
      lastOnline: isOnline ? null : now,
      lastSeen: now,
    });
  } catch (error) {
    console.error("Failed to update online status:", error);
  }
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe | null {
  if (!uid || !isFirebaseConfigured || !db) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (data.email && isAdminEmail(data.email) && data.role !== "admin") {
          data.role = "admin";
        }
        if (data.role === "admin") {
          data.level = 20;
          data.exp = 50;
        }
        callback(data);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn("Error in user profile subscription:", error);
    }
  );
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function createUserProfile(
  uid: string,
  username: string,
  email: string,
  role: UserRole = "user",
): Promise<UserProfile> {
  const resolvedRole: UserRole = isAdminEmail(email) ? "admin" : role;

  // 1. CEK DULU apakah profil untuk UID ini sudah ada di Firestore atau cache lokal!
  // JANGAN PERNAH menimpa data pengguna yang sudah ada!
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const existing = snap.data() as UserProfile;
        if (isAdminEmail(existing.email || email) && existing.role !== "admin") {
          existing.role = "admin";
          existing.level = 20;
          existing.exp = 50;
          await updateDoc(userRef, { role: "admin", level: 20, exp: 50 }).catch(() => {});
        }
        try {
          localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(existing));
        } catch {}
        return existing;
      }
    } catch (err) {
      console.warn("Could not check existing profile during createUserProfile:", err);
      const local = localStorage.getItem(`treenest_user_${uid}`);
      if (local) {
        try {
          const cached = JSON.parse(local) as UserProfile;
          return cached;
        } catch {}
      }
    }
  } else {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      try {
        const existing = JSON.parse(local) as UserProfile;
        return existing;
      } catch {}
    }
  }

  // Cek apakah ada cache lokal sebelumnya yang menyimpan accountId asli user
  let existingAccountId = "";
  try {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.accountId) existingAccountId = parsed.accountId;
    }
  } catch {}

  const accountId = existingAccountId || generateAccountId();
  const initials = username.slice(0, 2).toUpperCase();
  const hue = Math.floor(Math.random() * 360);
  const todayStr = getTodayDateString();

  const profile: UserProfile = {
    uid,
    username,
    accountId,
    email,
    bio: "Tumbuh pelan, tapi pasti.",
    initials,
    hue,
    level: resolvedRole === "admin" ? 20 : 1,
    exp: resolvedRole === "admin" ? 50 : 0,
    friendCount: 0,
    avatarUrl: "",
    totalLogins: 1,
    loginDates: [todayStr],
    socialLinks: [],
    themePreference: "light",
    role: resolvedRole,
    featuredFriends: [],
  };

  try {
    localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(profile));
  } catch {}

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, { ...profile, createdAt: Date.now() });
    } catch (err) {
      console.error("Error creating user profile in Firestore:", err);
    }
  }

  return profile;
}

export async function updateUserExpAndLevel(
  uid: string,
  newLevel: number,
  newExp: number,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      const data = JSON.parse(local);
      data.level = newLevel;
      data.exp = newExp;
      localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
    }
    return;
  }

  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { level: newLevel, exp: newExp });
  } catch (err) {
    console.error("Error updating EXP:", err);
  }
}

/** Catat login harian unik. Hanya menambah totalLogins jika tanggal (YYYY-MM-DD) belum pernah tercatat. */
export async function incrementTotalLogins(uid: string): Promise<void> {
  if (!uid || uid === "guest") return;
  const todayStr = getTodayDateString();

  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      try {
        const data = JSON.parse(local);
        const loginDates: string[] = Array.isArray(data.loginDates) ? data.loginDates : [];
        if (!loginDates.includes(todayStr)) {
          loginDates.push(todayStr);
          data.loginDates = loginDates;
          data.totalLogins = loginDates.length;
          localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
        }
      } catch {
        // ignore
      }
    }
    return;
  }
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const loginDates: string[] = Array.isArray(data?.["loginDates"]) ? data["loginDates"] : [];
      if (!loginDates.includes(todayStr)) {
        loginDates.push(todayStr);
        await updateDoc(userRef, {
          loginDates,
          totalLogins: loginDates.length,
        });
      }
    }
  } catch (err) {
    console.error("Error incrementing daily total logins:", err);
  }
}

/** Sinkronkan jumlah teman resmi (accepted) ke dalam UserProfile */
export async function syncUserFriendCount(uid: string): Promise<number> {
  if (!uid || uid === "guest") return 0;
  const friends = await getUserFriends(uid);
  const count = friends.length;

  const local = localStorage.getItem(`treenest_user_${uid}`);
  if (local) {
    try {
      const data = JSON.parse(local);
      data.friendCount = count;
      localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { friendCount: count });
    } catch (err) {
      console.warn("Error updating friendCount in Firestore:", err);
    }
  }
  return count;
}

export async function updateUserProfile(
  uid: string,
  patch: {
    username?: string;
    bio?: string;
    avatarUrl?: string;
    socialLinks?: import("./social").SocialLink[];
    themePreference?: "light" | "dark";
    treehouseVideoPrivacy?: "public" | "friends" | "private";
    accountId?: string;
  },
): Promise<void> {
  const initials = patch.username?.slice(0, 2).toUpperCase();

  // 1. Simpan ke local user store
  const local = localStorage.getItem(`treenest_user_${uid}`);
  let currentAccId = patch.accountId || "";
  if (local) {
    const data = JSON.parse(local);
    if (!currentAccId && data.accountId) currentAccId = data.accountId;
    if (patch.username !== undefined) {
      data.username = patch.username;
      data.initials = initials;
    }
    if (patch.bio !== undefined) data.bio = patch.bio;
    if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
    if (patch.socialLinks !== undefined) data.socialLinks = patch.socialLinks;
    if (patch.themePreference !== undefined) data.themePreference = patch.themePreference;
    if (patch.treehouseVideoPrivacy !== undefined) data.treehouseVideoPrivacy = patch.treehouseVideoPrivacy;
    localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
  }

  // 2. Perbarui snapshot profil di semua relasi pertemanan lokal
  const rawGlobal = localStorage.getItem("treenest_global_friendships");
  if (rawGlobal) {
    try {
      const list: StoredFriendship[] = JSON.parse(rawGlobal);
      let changed = false;
      list.forEach((f) => {
        if (f.userA.uid === uid || (currentAccId && f.userA.accountId === currentAccId)) {
          if (patch.avatarUrl !== undefined) f.userA.avatarUrl = patch.avatarUrl;
          if (patch.username !== undefined) {
            f.userA.name = patch.username;
            f.userA.initials = initials || patch.username.slice(0, 2).toUpperCase();
          }
          changed = true;
        }
        if (f.userB.uid === uid || (currentAccId && f.userB.accountId === currentAccId)) {
          if (patch.avatarUrl !== undefined) f.userB.avatarUrl = patch.avatarUrl;
          if (patch.username !== undefined) {
            f.userB.name = patch.username;
            f.userB.initials = initials || patch.username.slice(0, 2).toUpperCase();
          }
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("treenest_global_friendships", JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }

  if (!isFirebaseConfigured || !db) {
    return;
  }

  try {
    const userRef = doc(db, "users", uid);
    const updates: Record<string, unknown> = {};
    if (patch.username !== undefined) {
      updates["username"] = patch.username;
      if (initials) updates["initials"] = initials;
    }
    if (patch.bio !== undefined) updates["bio"] = patch.bio;
    if (patch.avatarUrl !== undefined) updates["avatarUrl"] = patch.avatarUrl;
    if (patch.socialLinks !== undefined) updates["socialLinks"] = patch.socialLinks;
    if (patch.themePreference !== undefined) updates["themePreference"] = patch.themePreference;
    if (patch.treehouseVideoPrivacy !== undefined) updates["treehouseVideoPrivacy"] = patch.treehouseVideoPrivacy;
    await updateDoc(userRef, updates);

    // Perbarui dokumen friendships di Firestore
    try {
      const qA = query(collection(db, FRIENDSHIPS_COLLECTION), where("users", "array-contains", uid));
      const snapA = await getDocs(qA);
      snapA.docs.forEach(async (d) => {
        const data = d.data() as StoredFriendship;
        const isUserA = data.userA.uid === uid;
        const targetKey = isUserA ? "userA" : "userB";
        const updateObj: Record<string, unknown> = {};
        if (patch.avatarUrl !== undefined) updateObj[`${targetKey}.avatarUrl`] = patch.avatarUrl;
        if (patch.username !== undefined) {
          updateObj[`${targetKey}.name`] = patch.username;
          if (initials) updateObj[`${targetKey}.initials`] = initials;
        }
        await updateDoc(d.ref, updateObj).catch(() => {});
      });
    } catch {
      // ignore
    }
  } catch (err) {
    console.error("Error updating user profile:", err);
  }
}

export async function deleteUserAccountFully(uid: string): Promise<void> {
  if (!uid || uid === "guest") return;
  localStorage.removeItem(`treenest_user_${uid}`);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (err) {
      console.error("Error deleting user profile from Firestore:", err);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Search & Friend System                                             */
/* ------------------------------------------------------------------ */

const FRIEND_REQUESTS_COLLECTION = "friend_requests";

export async function searchUserByAccountId(accountId: string): Promise<UserProfile | null> {
  if (!accountId) return null;
  const cleanId = accountId.trim();

  // Cek cache lokal terlebih dahulu jika ada
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("treenest_user_")) {
      try {
        const u: UserProfile = JSON.parse(localStorage.getItem(key) || "");
        if (
          u.accountId?.toUpperCase() === cleanId.toUpperCase() ||
          u.uid === cleanId ||
          u.username?.toUpperCase() === cleanId.toUpperCase() ||
          (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
        ) {
          if (!isFirebaseConfigured || !db) return u;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    // 1. Cari berdasarkan accountId (uppercase)
    let q = query(
      collection(db, "users"),
      where("accountId", "==", cleanId.toUpperCase()),
    );
    let snap = await getDocs(q);
    if (!snap.empty && snap.docs[0]) {
      const data = snap.docs[0].data() as UserProfile;
      try {
        localStorage.setItem(`treenest_user_${data.uid}`, JSON.stringify(data));
      } catch {}
      return data;
    }

    // 2. Cari berdasarkan accountId persis seperti input jika beda
    if (cleanId.toUpperCase() !== cleanId) {
      q = query(collection(db, "users"), where("accountId", "==", cleanId));
      snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        const data = snap.docs[0].data() as UserProfile;
        try {
          localStorage.setItem(`treenest_user_${data.uid}`, JSON.stringify(data));
        } catch {}
        return data;
      }
    }

    // 3. Cari berdasarkan Email jika input berupa email
    if (cleanId.includes("@")) {
      q = query(collection(db, "users"), where("email", "==", cleanId.toLowerCase()));
      snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        const data = snap.docs[0].data() as UserProfile;
        try {
          localStorage.setItem(`treenest_user_${data.uid}`, JSON.stringify(data));
        } catch {}
        return data;
      }
    }

    // 4. Fallback: Cari langsung menggunakan UID (getUserProfile)
    const profileByUid = await getUserProfile(cleanId);
    if (profileByUid) {
      return profileByUid;
    }

    // 5. Fallback: Cari berdasarkan username
    q = query(collection(db, "users"), where("username", "==", cleanId));
    snap = await getDocs(q);
    if (!snap.empty && snap.docs[0]) {
      const data = snap.docs[0].data() as UserProfile;
      try {
        localStorage.setItem(`treenest_user_${data.uid}`, JSON.stringify(data));
      } catch {}
      return data;
    }

    // 6. Terakhir: periksa kembali seluruh data user di localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("treenest_user_")) {
        try {
          const u: UserProfile = JSON.parse(localStorage.getItem(key) || "");
          if (
            u.accountId?.toUpperCase() === cleanId.toUpperCase() ||
            u.uid === cleanId ||
            u.username?.toUpperCase() === cleanId.toUpperCase() ||
            (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
          ) {
            return u;
          }
        } catch {}
      }
    }

    return null;
  } catch (err) {
    console.error("Error searching user:", err);
    return await getUserProfile(cleanId);
  }
}

/** Cari user berdasarkan nama pengguna (username) atau ID Akun (accountId) */
export async function searchUsers(searchTerm: string, currentUid?: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  if (!isFirebaseConfigured || !db) {
    const results: UserProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("treenest_user_")) {
        try {
          const user: UserProfile = JSON.parse(localStorage.getItem(key) || "");
          if (currentUid && user.uid === currentUid) continue;
          if (
            user.username?.toLowerCase().includes(term) ||
            user.accountId?.toLowerCase().includes(term)
          ) {
            results.push(user);
          }
        } catch {
          // ignore error
        }
      }
    }
    return results;
  }

  try {
    const snap = await getDocs(collection(db, "users"));
    const results: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const user = docSnap.data() as UserProfile;
      if (currentUid && user.uid === currentUid) return;
      if (
        user.username?.toLowerCase().includes(term) ||
        user.accountId?.toLowerCase().includes(term)
      ) {
        results.push(user);
      }
    });
    return results;
  } catch (err) {
    console.error("Error searching users:", err);
    return [];
  }
}

export type StoredFriendRequest = {
  id: string;
  fromUid: string;
  fromAccountId: string;
  fromName: string;
  fromInitials: string;
  fromHue: number;
  fromAvatarUrl?: string | undefined;
  toUid: string;
  toAccountId: string;
  toName: string;
  toInitials: string;
  toHue: number;
  toAvatarUrl?: string | undefined;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

/** Helper untuk men-trigger event lokal antar tab/komponen saat data sosial berubah */
export function triggerSocialUpdate(): void {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("treenest_social_update"));
      localStorage.setItem("treenest_last_social_update", String(Date.now()));
    } catch {}
  }
}

/** Kirim permintaan pertemanan dari fromUser ke toUser */
export async function sendFriendRequest(
  fromUser: { uid: string; accountId: string; name: string; initials: string; hue: number; avatarUrl?: string | undefined },
  toUser: { uid?: string | undefined; accountId: string; name: string; initials: string; hue: number; avatarUrl?: string | undefined },
): Promise<{ success: boolean; error?: string }> {
  // Resolve target UID if missing or placeholder
  let resolvedToUid = toUser.uid;
  if (!resolvedToUid || resolvedToUid.startsWith("uid_")) {
    const found = await searchUserByAccountId(toUser.accountId);
    if (found) {
      resolvedToUid = found.uid;
    } else {
      resolvedToUid = `uid_${toUser.accountId}`;
    }
  }

  if (fromUser.uid === resolvedToUid || fromUser.accountId?.toUpperCase() === toUser.accountId?.toUpperCase()) {
    return { success: false, error: "Tidak dapat menambahkan diri sendiri." };
  }

  // 1. Cek apakah sudah berteman resmi sebelumnya
  const currentFriends = await getUserFriends(fromUser.uid, fromUser.accountId);
  if (
    currentFriends.some(
      (f) =>
        f.accountId?.toUpperCase() === toUser.accountId?.toUpperCase() ||
        (resolvedToUid && f.uid === resolvedToUid),
    )
  ) {
    return { success: true };
  }

  // 2. Cek apakah pihak lawan (toUser) SUDAH mengirim permintaan pertemanan ke fromUser (Mutual request)
  // Jika ya, langsung otomatis terima dan jadikan mereka berteman resmi dua arah!
  const rawGlobalReqs = localStorage.getItem("treenest_global_friend_requests");
  const globalReqs: StoredFriendRequest[] = rawGlobalReqs ? JSON.parse(rawGlobalReqs) : [];
  const existingIncoming = globalReqs.find(
    (r) =>
      (r.fromUid === resolvedToUid || r.fromAccountId?.toUpperCase() === toUser.accountId?.toUpperCase()) &&
      (r.toUid === fromUser.uid || r.toAccountId?.toUpperCase() === fromUser.accountId?.toUpperCase()) &&
      r.status === "pending",
  );

  if (existingIncoming) {
    await acceptFriendRequest(existingIncoming.id, fromUser, {
      uid: resolvedToUid,
      accountId: toUser.accountId,
      name: toUser.name,
      initials: toUser.initials,
      hue: toUser.hue,
      avatarUrl: toUser.avatarUrl,
    });
    triggerSocialUpdate();
    return { success: true };
  }

  const reqData: Omit<StoredFriendRequest, "id"> = {
    fromUid: fromUser.uid,
    fromAccountId: fromUser.accountId.toUpperCase(),
    fromName: fromUser.name,
    fromInitials: fromUser.initials,
    fromHue: fromUser.hue,
    fromAvatarUrl: fromUser.avatarUrl || "",
    toUid: resolvedToUid,
    toAccountId: toUser.accountId.toUpperCase(),
    toName: toUser.name,
    toInitials: toUser.initials,
    toHue: toUser.hue,
    toAvatarUrl: toUser.avatarUrl || "",
    status: "pending",
    createdAt: Date.now(),
  };

  let createdDocId = generateId();

  if (isFirebaseConfigured && db) {
    try {
      // Check if reverse incoming request exists in Firestore
      const reverseQ = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("fromUid", "==", resolvedToUid),
        where("toUid", "==", fromUser.uid),
        where("status", "==", "pending"),
      );
      const reverseSnap = await getDocs(reverseQ);
      if (!reverseSnap.empty && reverseSnap.docs[0]) {
        const incomingDoc = reverseSnap.docs[0];
        await acceptFriendRequest(incomingDoc.id, fromUser, {
          uid: resolvedToUid,
          accountId: toUser.accountId,
          name: toUser.name,
          initials: toUser.initials,
          hue: toUser.hue,
          avatarUrl: toUser.avatarUrl,
        });
        triggerSocialUpdate();
        return { success: true };
      }

      // Check if already pending in Firestore
      const q = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("fromUid", "==", fromUser.uid),
        where("toUid", "==", resolvedToUid),
        where("status", "==", "pending"),
      );
      const existingSnap = await getDocs(q);
      if (existingSnap.empty) {
        const docRef = await addDoc(collection(db, FRIEND_REQUESTS_COLLECTION), reqData);
        createdDocId = docRef.id;
      } else if (existingSnap.docs[0]) {
        createdDocId = existingSnap.docs[0].id;
      }
    } catch (err) {
      console.error("Error sending friend request to Firestore:", err);
    }
  }

  // Update local storage with clean deduplicated state using real doc ID
  const list = globalReqs.filter(
    (r) =>
      !(
        ((r.fromUid === fromUser.uid && r.toUid === resolvedToUid) ||
          (r.fromAccountId?.toUpperCase() === fromUser.accountId?.toUpperCase() &&
            r.toAccountId?.toUpperCase() === toUser.accountId?.toUpperCase())) &&
        r.status === "pending"
      ),
  );
  list.push({ id: createdDocId, ...reqData });
  localStorage.setItem("treenest_global_friend_requests", JSON.stringify(list));

  // Notifikasi real-time
  try {
    addNotification({
      type: "friend_request_received",
      title: "Permintaan Pertemanan",
      message: `${fromUser.name} menyukai profilmu dan mengirim permintaan pertemanan.`,
      link: "/friend-club?tab=requests",
      targetUid: resolvedToUid,
    });
  } catch {}

  triggerSocialUpdate();
  return { success: true };
}

/** Ambil permintaan pertemanan masuk untuk user tertentu */
export async function getIncomingFriendRequests(
  uid: string,
  accountId?: string,
  knownFriends?: Friend[],
): Promise<FriendRequest[]> {
  if (!uid || uid === "guest") return [];

  // Ambil daftar teman yang sudah resmi untuk memfilter request usang
  const currentFriends = knownFriends || (await getUserFriends(uid, accountId));
  const friendAccountIds = new Set(currentFriends.map((f) => f.accountId?.toUpperCase()));
  const friendUids = new Set(currentFriends.map((f) => f.uid));

  // Key map by sender identifier (fromAccountId or fromUid) to prevent any duplicate entries
  const map = new Map<string, FriendRequest>();
  let hasStaleLocal = false;

  // 1. Baca dari local storage
  const raw = localStorage.getItem("treenest_global_friend_requests");
  if (raw) {
    try {
      const list: StoredFriendRequest[] = JSON.parse(raw);
      const validList = list.filter((r) => {
        if (
          friendAccountIds.has(r.fromAccountId?.toUpperCase()) ||
          friendAccountIds.has(r.toAccountId?.toUpperCase()) ||
          friendUids.has(r.fromUid) ||
          friendUids.has(r.toUid)
        ) {
          hasStaleLocal = true;
          return false;
        }
        return r.status === "pending";
      });

      if (hasStaleLocal) {
        localStorage.setItem("treenest_global_friend_requests", JSON.stringify(validList));
      }

      validList
        .filter(
          (r) =>
            (r.toUid === uid || (accountId && r.toAccountId?.toUpperCase() === accountId?.toUpperCase())) &&
            r.status === "pending",
        )
        .forEach((r) => {
          const senderKey = (r.fromAccountId || r.fromUid).toUpperCase();
          map.set(senderKey, {
            id: r.id,
            from: {
              uid: r.fromUid,
              accountId: r.fromAccountId,
              name: r.fromName,
              initials: r.fromInitials,
              hue: r.fromHue,
              avatarUrl: r.fromAvatarUrl || undefined,
            },
            createdAt: r.createdAt,
            status: r.status,
          });
        });
    } catch {
      // ignore
    }
  }

  if (!isFirebaseConfigured || !db) {
    return Array.from(map.values());
  }

  // 2. Baca dari Firestore jika ada
  try {
    const qUid = query(
      collection(db, FRIEND_REQUESTS_COLLECTION),
      where("toUid", "==", uid),
      where("status", "==", "pending"),
    );
    const snapUid = await getDocs(qUid);
    snapUid.docs.forEach((d) => {
      const data = d.data() as StoredFriendRequest;
      if (friendAccountIds.has(data.fromAccountId?.toUpperCase()) || friendUids.has(data.fromUid)) {
        deleteDoc(d.ref).catch(() => {});
        return;
      }

      const senderKey = (data.fromAccountId || data.fromUid).toUpperCase();
      map.set(senderKey, {
        id: d.id,
        from: {
          uid: data.fromUid,
          accountId: data.fromAccountId,
          name: data.fromName,
          initials: data.fromInitials,
          hue: data.fromHue,
          avatarUrl: data.fromAvatarUrl || undefined,
        },
        createdAt: data.createdAt,
        status: data.status,
      });
    });

    if (accountId) {
      const qAcc = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("toAccountId", "==", accountId.toUpperCase()),
        where("status", "==", "pending"),
      );
      const snapAcc = await getDocs(qAcc);
      snapAcc.docs.forEach((d) => {
        const data = d.data() as StoredFriendRequest;
        if (friendAccountIds.has(data.fromAccountId?.toUpperCase()) || friendUids.has(data.fromUid)) {
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        const senderKey = (data.fromAccountId || data.fromUid).toUpperCase();
        map.set(senderKey, {
          id: d.id,
          from: {
            uid: data.fromUid,
            accountId: data.fromAccountId,
            name: data.fromName,
            initials: data.fromInitials,
            hue: data.fromHue,
            avatarUrl: data.fromAvatarUrl || undefined,
          },
          createdAt: data.createdAt,
          status: data.status,
        });
      });
    }
  } catch (err) {
    console.warn("Firestore incoming requests check warning:", err);
  }

  return Array.from(map.values());
}

/** Ambil permintaan pertemanan yang dikirim oleh user tertentu */
export async function getSentFriendRequests(
  uid: string,
  accountId?: string,
  knownFriends?: Friend[],
): Promise<SentRequest[]> {
  if (!uid || uid === "guest") return [];

  const currentFriends = knownFriends || (await getUserFriends(uid, accountId));
  const friendAccountIds = new Set(currentFriends.map((f) => f.accountId?.toUpperCase()));
  const friendUids = new Set(currentFriends.map((f) => f.uid));

  // Key map by recipient identifier (toAccountId or toUid) to prevent duplicate entries
  const map = new Map<string, SentRequest>();
  let hasStaleLocal = false;

  // 1. Baca dari local storage
  const raw = localStorage.getItem("treenest_global_friend_requests");
  if (raw) {
    try {
      const list: StoredFriendRequest[] = JSON.parse(raw);
      const validList = list.filter((r) => {
        if (
          friendAccountIds.has(r.fromAccountId?.toUpperCase()) ||
          friendAccountIds.has(r.toAccountId?.toUpperCase()) ||
          friendUids.has(r.fromUid) ||
          friendUids.has(r.toUid)
        ) {
          hasStaleLocal = true;
          return false;
        }
        return r.status === "pending";
      });

      if (hasStaleLocal) {
        localStorage.setItem("treenest_global_friend_requests", JSON.stringify(validList));
      }

      validList
        .filter(
          (r) =>
            (r.fromUid === uid || (accountId && r.fromAccountId?.toUpperCase() === accountId?.toUpperCase())) &&
            r.status === "pending",
        )
        .forEach((r) => {
          const targetKey = (r.toAccountId || r.toUid).toUpperCase();
          map.set(targetKey, {
            id: r.id,
            to: {
              uid: r.toUid,
              accountId: r.toAccountId,
              name: r.toName,
              initials: r.toInitials,
              hue: r.toHue,
              avatarUrl: r.toAvatarUrl || undefined,
            },
            createdAt: r.createdAt,
            status: r.status,
          });
        });
    } catch {
      // ignore
    }
  }

  if (!isFirebaseConfigured || !db) {
    return Array.from(map.values());
  }

  // 2. Baca dari Firestore jika ada
  try {
    const qUid = query(
      collection(db, FRIEND_REQUESTS_COLLECTION),
      where("fromUid", "==", uid),
      where("status", "==", "pending"),
    );
    const snapUid = await getDocs(qUid);
    snapUid.docs.forEach((d) => {
      const data = d.data() as StoredFriendRequest;
      if (friendAccountIds.has(data.toAccountId?.toUpperCase()) || friendUids.has(data.toUid)) {
        deleteDoc(d.ref).catch(() => {});
        return;
      }

      const targetKey = (data.toAccountId || data.toUid).toUpperCase();
      map.set(targetKey, {
        id: d.id,
        to: {
          uid: data.toUid,
          accountId: data.toAccountId,
          name: data.toName,
          initials: data.toInitials,
          hue: data.toHue,
          avatarUrl: data.toAvatarUrl || undefined,
        },
        createdAt: data.createdAt,
        status: data.status,
      });
    });

    if (accountId) {
      const qAcc = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("fromAccountId", "==", accountId.toUpperCase()),
        where("status", "==", "pending"),
      );
      const snapAcc = await getDocs(qAcc);
      snapAcc.docs.forEach((d) => {
        const data = d.data() as StoredFriendRequest;
        if (friendAccountIds.has(data.toAccountId?.toUpperCase()) || friendUids.has(data.toUid)) {
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        const targetKey = (data.toAccountId || data.toUid).toUpperCase();
        map.set(targetKey, {
          id: d.id,
          to: {
            uid: data.toUid,
            accountId: data.toAccountId,
            name: data.toName,
            initials: data.toInitials,
            hue: data.toHue,
            avatarUrl: data.toAvatarUrl || undefined,
          },
          createdAt: data.createdAt,
          status: data.status,
        });
      });
    }
  } catch (err) {
    console.warn("Firestore sent requests check warning:", err);
  }

  return Array.from(map.values());
}

/** Subscribe realtime ke permintaan pertemanan masuk */
export function subscribeToIncomingFriendRequests(
  uid: string,
  accountId: string | undefined,
  callback: (requests: FriendRequest[]) => void,
): () => void {
  if (!uid || uid === "guest") {
    callback([]);
    return () => {};
  }

  let isUnsubscribed = false;
  const unsubs: Array<() => void> = [];

  const handleUpdate = async () => {
    if (isUnsubscribed) return;
    try {
      const data = await getIncomingFriendRequests(uid, accountId);
      if (!isUnsubscribed) {
        callback(data);
      }
    } catch {
      // ignore
    }
  };

  // Run immediate first load
  handleUpdate();

  if (isFirebaseConfigured && db) {
    try {
      const qUid = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("toUid", "==", uid),
        where("status", "==", "pending"),
      );
      const unsub1 = onSnapshot(
        qUid,
        () => handleUpdate(),
        (err) => console.warn("Incoming friend requests snapshot notice (uid):", err)
      );
      unsubs.push(unsub1);

      if (accountId) {
        const qAcc = query(
          collection(db, FRIEND_REQUESTS_COLLECTION),
          where("toAccountId", "==", accountId.toUpperCase()),
          where("status", "==", "pending"),
        );
        const unsub2 = onSnapshot(
          qAcc,
          () => handleUpdate(),
          (err) => console.warn("Incoming friend requests snapshot notice (acc):", err)
        );
        unsubs.push(unsub2);
      }
    } catch (err) {
      console.warn("Could not subscribe to incoming friend requests in Firestore:", err);
    }
  }

  const handleStorageEvent = () => handleUpdate();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("treenest_social_update", handleStorageEvent);
    unsubs.push(() => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("treenest_social_update", handleStorageEvent);
    });
  }

  return () => {
    isUnsubscribed = true;
    unsubs.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

/** Subscribe realtime ke permintaan pertemanan terkirim */
export function subscribeToSentFriendRequests(
  uid: string,
  accountId: string | undefined,
  callback: (sent: SentRequest[]) => void,
): () => void {
  if (!uid || uid === "guest") {
    callback([]);
    return () => {};
  }

  let isUnsubscribed = false;
  const unsubs: Array<() => void> = [];

  const handleUpdate = async () => {
    if (isUnsubscribed) return;
    try {
      const data = await getSentFriendRequests(uid, accountId);
      if (!isUnsubscribed) {
        callback(data);
      }
    } catch {
      // ignore
    }
  };

  handleUpdate();

  if (isFirebaseConfigured && db) {
    try {
      const qUid = query(
        collection(db, FRIEND_REQUESTS_COLLECTION),
        where("fromUid", "==", uid),
        where("status", "==", "pending"),
      );
      const unsub1 = onSnapshot(
        qUid,
        () => handleUpdate(),
        (err) => console.warn("Sent friend requests snapshot notice (uid):", err)
      );
      unsubs.push(unsub1);

      if (accountId) {
        const qAcc = query(
          collection(db, FRIEND_REQUESTS_COLLECTION),
          where("fromAccountId", "==", accountId.toUpperCase()),
          where("status", "==", "pending"),
        );
        const unsub2 = onSnapshot(
          qAcc,
          () => handleUpdate(),
          (err) => console.warn("Sent friend requests snapshot notice (acc):", err)
        );
        unsubs.push(unsub2);
      }
    } catch (err) {
      console.warn("Could not subscribe to sent friend requests in Firestore:", err);
    }
  }

  const handleStorageEvent = () => handleUpdate();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("treenest_social_update", handleStorageEvent);
    unsubs.push(() => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("treenest_social_update", handleStorageEvent);
    });
  }

  return () => {
    isUnsubscribed = true;
    unsubs.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

export type StoredFriendship = {
  id: string;
  users: string[]; // [uid1, uid2]
  accountIds: string[]; // [accountId1, accountId2]
  userA: {
    uid: string;
    accountId: string;
    name: string;
    initials: string;
    hue: number;
    avatarUrl?: string | undefined;
  };
  userB: {
    uid: string;
    accountId: string;
    name: string;
    initials: string;
    hue: number;
    avatarUrl?: string | undefined;
  };
  since: number;
};

const FRIENDSHIPS_COLLECTION = "friendships";

/** Terima permintaan pertemanan (kedua akun saling berteman secara dua arah & seluruh request pending kedua pihak dibersihkan) */
export async function acceptFriendRequest(
  requestId: string,
  currentUser: { uid: string; accountId: string; name: string; initials: string; hue: number; avatarUrl?: string | undefined },
  requestFrom: { uid?: string | undefined; accountId: string; name: string; initials: string; hue: number; avatarUrl?: string | undefined },
): Promise<void> {
  let fromUid = requestFrom.uid;
  if (!fromUid || fromUid.startsWith("uid_")) {
    const found = await searchUserByAccountId(requestFrom.accountId);
    if (found) {
      fromUid = found.uid;
    } else {
      fromUid = `uid_${requestFrom.accountId}`;
    }
  }

  const toUid = currentUser.uid;
  const now = Date.now();
  const docId = [fromUid, toUid].sort().join("_");

  const fromAccId = requestFrom.accountId.trim().toUpperCase();
  const toAccId = currentUser.accountId.trim().toUpperCase();

  const friendshipData: StoredFriendship = {
    id: docId,
    users: [fromUid, toUid],
    accountIds: [fromAccId, toAccId],
    userA: {
      uid: fromUid,
      accountId: fromAccId,
      name: requestFrom.name,
      initials: requestFrom.initials,
      hue: requestFrom.hue,
      avatarUrl: requestFrom.avatarUrl || undefined,
    },
    userB: {
      uid: toUid,
      accountId: toAccId,
      name: currentUser.name,
      initials: currentUser.initials,
      hue: currentUser.hue,
      avatarUrl: currentUser.avatarUrl || undefined,
    },
    since: now,
  };

  const friendForCurrent: Friend = {
    id: docId,
    uid: fromUid,
    accountId: fromAccId,
    name: requestFrom.name,
    initials: requestFrom.initials,
    hue: requestFrom.hue,
    avatarUrl: requestFrom.avatarUrl || undefined,
    since: now,
  };

  const friendForSender: Friend = {
    id: docId,
    uid: toUid,
    accountId: toAccId,
    name: currentUser.name,
    initials: currentUser.initials,
    hue: currentUser.hue,
    avatarUrl: currentUser.avatarUrl || undefined,
    since: now,
  };

  // 1. Bersihkan SEMUA request pertemanan dua arah antara kedua user ini dari Local Storage
  const rawReq = localStorage.getItem("treenest_global_friend_requests");
  if (rawReq) {
    try {
      const reqs: StoredFriendRequest[] = JSON.parse(rawReq);
      const cleaned = reqs.filter((r) => {
        if (r.id === requestId) return false;
        const isBetweenUsers =
          (r.fromUid === fromUid && r.toUid === toUid) ||
          (r.fromUid === toUid && r.toUid === fromUid) ||
          (r.fromAccountId?.toUpperCase() === fromAccId && r.toAccountId?.toUpperCase() === toAccId) ||
          (r.fromAccountId?.toUpperCase() === toAccId && r.toAccountId?.toUpperCase() === fromAccId);
        return !isBetweenUsers;
      });
      localStorage.setItem("treenest_global_friend_requests", JSON.stringify(cleaned));
    } catch {
      // ignore
    }
  }

  const rawGlobal = localStorage.getItem("treenest_global_friendships");
  const globalList: StoredFriendship[] = rawGlobal ? JSON.parse(rawGlobal) : [];
  if (!globalList.some((f) => f.id === docId)) {
    globalList.push(friendshipData);
    localStorage.setItem("treenest_global_friendships", JSON.stringify(globalList));
  }

  // Simpan di local friend list untuk kedua user
  const curFriendsRaw = localStorage.getItem(`treenest_friends_${toUid}`);
  const curFriends: Friend[] = curFriendsRaw ? JSON.parse(curFriendsRaw) : [];
  if (!curFriends.some((f) => f.accountId?.toUpperCase() === fromAccId)) {
    curFriends.push(friendForCurrent);
    localStorage.setItem(`treenest_friends_${toUid}`, JSON.stringify(curFriends));
  }

  const sndFriendsRaw = localStorage.getItem(`treenest_friends_${fromUid}`);
  const sndFriends: Friend[] = sndFriendsRaw ? JSON.parse(sndFriendsRaw) : [];
  if (!sndFriends.some((f) => f.accountId?.toUpperCase() === toAccId)) {
    sndFriends.push(friendForSender);
    localStorage.setItem(`treenest_friends_${fromUid}`, JSON.stringify(sndFriends));
  }

  // Kirim notifikasi konfirmasi pertemanan untuk pengirim request (fromUid) dan penerima (toUid)
  try {
    addNotification({
      type: "friend_accepted",
      title: "Permintaan Diterima!",
      message: `${currentUser.name || "Seseorang"} telah menerima permintaan pertemananmu.`,
      link: "/friend-club?tab=list",
      targetUid: fromUid,
    });
    addNotification({
      type: "friend_accepted",
      title: "Teman Baru Terhubung!",
      message: `${requestFrom.name || "Teman baru"} sekarang resmi menjadi temanmu.`,
      link: "/friend-club?tab=list",
      targetUid: toUid,
    });
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) {
    triggerSocialUpdate();
    return;
  }

  // 2. Tulis ke Firestore & Hapus SEMUA request pending dua arah antara kedua user di Firestore
  try {
    const deletePromises: Promise<void>[] = [];
    if (requestId) {
      deletePromises.push(deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, requestId)).catch(() => {}));
    }

    // Query dan hapus request dari A ke B dan B ke A
    const q1 = query(
      collection(db, FRIEND_REQUESTS_COLLECTION),
      where("fromUid", "==", fromUid),
      where("toUid", "==", toUid),
    );
    const q2 = query(
      collection(db, FRIEND_REQUESTS_COLLECTION),
      where("fromUid", "==", toUid),
      where("toUid", "==", fromUid),
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    snap1.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref).catch(() => {})));
    snap2.docs.forEach((d) => deletePromises.push(deleteDoc(d.ref).catch(() => {})));

    await Promise.all(deletePromises);
    await setDoc(doc(db, FRIENDSHIPS_COLLECTION, docId), friendshipData);

    try {
      await setDoc(doc(db, "users", toUid, "friends", fromUid), friendForCurrent);
    } catch {
      // ignore
    }
    try {
      await setDoc(doc(db, "users", fromUid, "friends", toUid), friendForSender);
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn("Firestore accept friend request notice:", err);
  }

  // Sync total pertemanan resmi
  await syncUserFriendCount(toUid);
  await syncUserFriendCount(fromUid);
  triggerSocialUpdate();
}

/** Tolak permintaan pertemanan */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const rawReq = localStorage.getItem("treenest_global_friend_requests");
  if (rawReq) {
    const reqs: StoredFriendRequest[] = JSON.parse(rawReq);
    localStorage.setItem(
      "treenest_global_friend_requests",
      JSON.stringify(reqs.filter((r) => r.id !== requestId)),
    );
  }

  if (!isFirebaseConfigured || !db) {
    triggerSocialUpdate();
    return;
  }

  try {
    await deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, requestId));
  } catch (err) {
    console.warn("Firestore reject friend request notice:", err);
  }

  triggerSocialUpdate();
}

/** Batalkan permintaan pertemanan yang telah dikirim */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  return rejectFriendRequest(requestId);
}

/** Ambil daftar teman dari user tertentu (100% dua arah terjamin & selalu sinkron dengan profil terbaru) */
export async function getUserFriends(uid: string, accountId?: string): Promise<Friend[]> {
  if (!uid || uid === "guest") return [];

  const normAccountId = accountId?.trim().toUpperCase();

  // Jika Firestore terkonfigurasi, jadikan Firestore sebagai sumber kebenaran (Source of Truth)
  if (isFirebaseConfigured && db) {
    try {
      const friendsMap = new Map<string, Friend>();

      // 1. Kueri dokumen pertemanan berdasarkan UID
      const qUid = query(
        collection(db, FRIENDSHIPS_COLLECTION),
        where("users", "array-contains", uid),
      );
      const snapUid = await getDocs(qUid);
      snapUid.docs.forEach((d) => {
        const data = d.data() as StoredFriendship;
        const isUserA =
          data.userA.uid === uid ||
          (normAccountId && data.userA.accountId?.toUpperCase() === normAccountId);
        const other = isUserA ? data.userB : data.userA;
        if (other && other.accountId) {
          friendsMap.set(other.accountId.toUpperCase(), {
            id: d.id,
            uid: other.uid,
            accountId: other.accountId,
            name: other.name,
            initials: other.initials,
            hue: other.hue,
            avatarUrl: other.avatarUrl || undefined,
            since: data.since || Date.now(),
          });
        }
      });

      // 2. Kueri dokumen pertemanan berdasarkan accountId jika ada (mencegah placeholder UID mismatch)
      if (normAccountId) {
        const qAcc = query(
          collection(db, FRIENDSHIPS_COLLECTION),
          where("accountIds", "array-contains", normAccountId),
        );
        const snapAcc = await getDocs(qAcc);
        snapAcc.docs.forEach((d) => {
          const data = d.data() as StoredFriendship;
          const isUserA =
            data.userA.uid === uid ||
            (normAccountId && data.userA.accountId?.toUpperCase() === normAccountId);
          const other = isUserA ? data.userB : data.userA;
          if (other && other.accountId) {
            friendsMap.set(other.accountId.toUpperCase(), {
              id: d.id,
              uid: other.uid,
              accountId: other.accountId,
              name: other.name,
              initials: other.initials,
              hue: other.hue,
              avatarUrl: other.avatarUrl || undefined,
              since: data.since || Date.now(),
            });
          }
        });
      }

      // 3. Kueri subcollection users/{uid}/friends
      try {
        const subSnap = await getDocs(collection(db, "users", uid, "friends"));
        subSnap.forEach((d) => {
          const f = d.data() as Friend;
          if (f && f.accountId) {
            const key = f.accountId.toUpperCase();
            if (!friendsMap.has(key)) {
              friendsMap.set(key, { ...f, id: d.id });
            }
          }
        });
      } catch {
        // ignore
      }

      const friendsList = Array.from(friendsMap.values());

      // Rekonsiliasi & perbarui cache lokal agar selalu persis dengan data Firestore aktif
      try {
        localStorage.setItem(`treenest_friends_${uid}`, JSON.stringify(friendsList));
        const rawGlobal = localStorage.getItem("treenest_global_friendships");
        if (rawGlobal) {
          const list: StoredFriendship[] = JSON.parse(rawGlobal);
          const activeFriendAccIds = new Set(friendsList.map((f) => f.accountId.toUpperCase()));
          const cleanedGlobal = list.filter((f) => {
            const isRelated =
              (f.users && f.users.includes(uid)) ||
              (normAccountId && f.accountIds && f.accountIds.includes(normAccountId));
            if (!isRelated) return true;
            const otherAcc =
              f.userA.uid === uid || (normAccountId && f.userA.accountId?.toUpperCase() === normAccountId)
                ? f.userB.accountId?.toUpperCase()
                : f.userA.accountId?.toUpperCase();
            return otherAcc ? activeFriendAccIds.has(otherAcc) : false;
          });
          localStorage.setItem("treenest_global_friendships", JSON.stringify(cleanedGlobal));
        }
      } catch {
        // ignore
      }

      // Sinkronisasi cepat avatar/username terbaru teman dari cache profil lokal
      friendsList.forEach((friend) => {
        try {
          let liveProfile: UserProfile | null = null;
          if (friend.uid && !friend.uid.startsWith("uid_")) {
            const rawLocal = localStorage.getItem(`treenest_user_${friend.uid}`);
            if (rawLocal) liveProfile = JSON.parse(rawLocal);
          }
          if (liveProfile) {
            if (liveProfile.avatarUrl !== undefined) friend.avatarUrl = liveProfile.avatarUrl || undefined;
            if (liveProfile.username) friend.name = liveProfile.username;
            if (liveProfile.initials) friend.initials = liveProfile.initials;
            if (liveProfile.hue !== undefined) friend.hue = liveProfile.hue;
          }
        } catch {
          // ignore
        }
      });

      return friendsList;
    } catch (err) {
      console.warn("Firestore getUserFriends warning, falling back to local:", err);
    }
  }

  // Fallback untuk mode non-Firebase / offline:
  const friendsMap = new Map<string, Friend>();
  const rawGlobal = localStorage.getItem("treenest_global_friendships");
  if (rawGlobal) {
    try {
      const list: StoredFriendship[] = JSON.parse(rawGlobal);
      list
        .filter(
          (f) =>
            (f.users && f.users.includes(uid)) ||
            (normAccountId && f.accountIds && f.accountIds.includes(normAccountId)),
        )
        .forEach((f) => {
          const isUserA =
            f.userA.uid === uid || (normAccountId && f.userA.accountId?.toUpperCase() === normAccountId);
          const other = isUserA ? f.userB : f.userA;
          friendsMap.set(other.accountId.toUpperCase(), {
            id: f.id,
            uid: other.uid,
            accountId: other.accountId,
            name: other.name,
            initials: other.initials,
            hue: other.hue,
            avatarUrl: other.avatarUrl || undefined,
            since: f.since,
          });
        });
    } catch {
      // ignore
    }
  }

  const curFriendsRaw = localStorage.getItem(`treenest_friends_${uid}`);
  if (curFriendsRaw) {
    try {
      const curList: Friend[] = JSON.parse(curFriendsRaw);
      curList.forEach((f) => {
        const key = f.accountId.toUpperCase();
        if (!friendsMap.has(key)) {
          friendsMap.set(key, f);
        }
      });
    } catch {
      // ignore
    }
  }

  return Array.from(friendsMap.values());
}

/** Subscribe realtime ke daftar teman user */
export function subscribeToUserFriends(
  uid: string,
  accountId: string | undefined,
  callback: (friends: Friend[]) => void,
): () => void {
  if (!uid || uid === "guest") {
    callback([]);
    return () => {};
  }

  const normAccountId = accountId?.trim().toUpperCase();
  let isUnsubscribed = false;
  const unsubs: Array<() => void> = [];

  const handleUpdate = async () => {
    if (isUnsubscribed) return;
    try {
      const data = await getUserFriends(uid, accountId);
      if (!isUnsubscribed) {
        callback(data);
      }
    } catch {
      // ignore
    }
  };

  handleUpdate();

  if (isFirebaseConfigured && db) {
    try {
      const qUid = query(
        collection(db, FRIENDSHIPS_COLLECTION),
        where("users", "array-contains", uid),
      );
      const unsub1 = onSnapshot(
        qUid,
        () => handleUpdate(),
        (err) => console.warn("Friends snapshot notice (uid):", err),
      );
      unsubs.push(unsub1);

      if (normAccountId) {
        const qAcc = query(
          collection(db, FRIENDSHIPS_COLLECTION),
          where("accountIds", "array-contains", normAccountId),
        );
        const unsub2 = onSnapshot(
          qAcc,
          () => handleUpdate(),
          (err) => console.warn("Friends snapshot notice (acc):", err),
        );
        unsubs.push(unsub2);
      }

      const unsub3 = onSnapshot(
        collection(db, "users", uid, "friends"),
        () => handleUpdate(),
        (err) => console.warn("Friends snapshot notice (subcol):", err),
      );
      unsubs.push(unsub3);
    } catch (err) {
      console.warn("Could not subscribe to user friends in Firestore:", err);
    }
  }

  const handleStorageEvent = () => handleUpdate();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("treenest_social_update", handleStorageEvent);
    unsubs.push(() => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("treenest_social_update", handleStorageEvent);
    });
  }

  return () => {
    isUnsubscribed = true;
    unsubs.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

/** Hapus hubungan pertemanan secara tuntas di kedua akun */
export async function removeFriendship(
  currentUid: string,
  friendAccountId: string,
  friendUid?: string | undefined,
): Promise<void> {
  const normFriendAccId = friendAccountId.trim().toUpperCase();
  let resolvedFriendUid = friendUid;
  if (!resolvedFriendUid || resolvedFriendUid.startsWith("uid_")) {
    const userProf = await searchUserByAccountId(normFriendAccId);
    if (userProf) resolvedFriendUid = userProf.uid;
    else resolvedFriendUid = `uid_${normFriendAccId}`;
  }

  const docId = [currentUid, resolvedFriendUid].sort().join("_");

  // 1. Hapus dari global friendships lokal untuk semua record yang cocok
  const rawGlobal = localStorage.getItem("treenest_global_friendships");
  if (rawGlobal) {
    try {
      const list: StoredFriendship[] = JSON.parse(rawGlobal);
      const updated = list.filter((f) => {
        if (f.id === docId) return false;
        const matchAcc =
          f.accountIds?.some((a) => a.toUpperCase() === normFriendAccId) ||
          f.userA?.accountId?.toUpperCase() === normFriendAccId ||
          f.userB?.accountId?.toUpperCase() === normFriendAccId;
        const matchUid =
          (resolvedFriendUid && f.users?.includes(resolvedFriendUid)) ||
          (resolvedFriendUid && (f.userA?.uid === resolvedFriendUid || f.userB?.uid === resolvedFriendUid));
        const matchCurrent =
          f.users?.includes(currentUid) ||
          f.userA?.uid === currentUid ||
          f.userB?.uid === currentUid;
        if (matchCurrent && (matchAcc || matchUid)) return false;
        return true;
      });
      localStorage.setItem("treenest_global_friendships", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // 2. Hapus dari daftar teman lokal akun saat ini
  const curFriendsRaw = localStorage.getItem(`treenest_friends_${currentUid}`);
  if (curFriendsRaw) {
    try {
      const list: Friend[] = JSON.parse(curFriendsRaw);
      localStorage.setItem(
        `treenest_friends_${currentUid}`,
        JSON.stringify(
          list.filter(
            (f) =>
              f.accountId?.toUpperCase() !== normFriendAccId &&
              f.uid !== resolvedFriendUid &&
              f.id !== docId,
          ),
        ),
      );
    } catch {
      // ignore
    }
  }

  // 3. Hapus dari daftar teman lokal akun teman
  if (resolvedFriendUid) {
    const sndFriendsRaw = localStorage.getItem(`treenest_friends_${resolvedFriendUid}`);
    if (sndFriendsRaw) {
      try {
        const list: Friend[] = JSON.parse(sndFriendsRaw);
        localStorage.setItem(
          `treenest_friends_${resolvedFriendUid}`,
          JSON.stringify(list.filter((f) => f.uid !== currentUid && f.id !== docId)),
        );
      } catch {
        // ignore
      }
    }
  }

  // 4. Hapus dari teman tampil jika sedang dipilih
  const featRaw = localStorage.getItem(`treenest_featured_friends_${currentUid}`);
  if (featRaw) {
    try {
      const featList: string[] = JSON.parse(featRaw);
      localStorage.setItem(
        `treenest_featured_friends_${currentUid}`,
        JSON.stringify(
          featList.filter(
            (id) =>
              id.toUpperCase() !== normFriendAccId &&
              id !== resolvedFriendUid &&
              id !== docId,
          ),
        ),
      );
    } catch {
      // ignore
    }
  }

  if (isFirebaseConfigured && db) {
    // 5. Hapus dari Firestore
    try {
      // Delete docId direct
      await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, docId)).catch(() => {});

      // Query any document in friendships where current user is involved and matches friend
      const q1 = query(
        collection(db, FRIENDSHIPS_COLLECTION),
        where("users", "array-contains", currentUid),
      );
      const q2 = query(
        collection(db, FRIENDSHIPS_COLLECTION),
        where("accountIds", "array-contains", normFriendAccId),
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const docsToDelete = new Set<string>();

      snap1.docs.forEach((d) => {
        const data = d.data() as StoredFriendship;
        const matchAcc =
          data.accountIds?.some((a) => a.toUpperCase() === normFriendAccId) ||
          data.userA?.accountId?.toUpperCase() === normFriendAccId ||
          data.userB?.accountId?.toUpperCase() === normFriendAccId;
        const matchUid =
          (resolvedFriendUid && data.users?.includes(resolvedFriendUid)) ||
          (resolvedFriendUid && (data.userA?.uid === resolvedFriendUid || data.userB?.uid === resolvedFriendUid));
        if (matchAcc || matchUid) docsToDelete.add(d.id);
      });

      snap2.docs.forEach((d) => {
        const data = d.data() as StoredFriendship;
        const matchCurrent =
          data.users?.includes(currentUid) ||
          data.userA?.uid === currentUid ||
          data.userB?.uid === currentUid;
        if (matchCurrent) docsToDelete.add(d.id);
      });

      for (const id of docsToDelete) {
        await deleteDoc(doc(db, FRIENDSHIPS_COLLECTION, id)).catch(() => {});
      }

      // Delete subcollection documents in users/{uid}/friends
      if (resolvedFriendUid) {
        await deleteDoc(doc(db, "users", currentUid, "friends", resolvedFriendUid)).catch(() => {});
        await deleteDoc(doc(db, "users", resolvedFriendUid, "friends", currentUid)).catch(() => {});
      }
      await deleteDoc(doc(db, "users", currentUid, "friends", normFriendAccId)).catch(() => {});

      try {
        const subSnap1 = await getDocs(collection(db, "users", currentUid, "friends"));
        subSnap1.docs.forEach((d) => {
          const f = d.data() as Friend;
          if (f.accountId?.toUpperCase() === normFriendAccId || f.uid === resolvedFriendUid) {
            deleteDoc(d.ref).catch(() => {});
          }
        });
      } catch {
        // ignore
      }

      if (resolvedFriendUid && !resolvedFriendUid.startsWith("uid_")) {
        try {
          const subSnap2 = await getDocs(collection(db, "users", resolvedFriendUid, "friends"));
          subSnap2.docs.forEach((d) => {
            const f = d.data() as Friend;
            if (f.uid === currentUid) {
              deleteDoc(d.ref).catch(() => {});
            }
          });
        } catch {
          // ignore
        }
      }

      try {
        const userRef = doc(db, "users", currentUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const feat: string[] = uData?.["featuredFriends"] || [];
          const cleanedFeat = feat.filter(
            (id) =>
              id.toUpperCase() !== normFriendAccId &&
              id !== resolvedFriendUid &&
              id !== docId,
          );
          if (cleanedFeat.length !== feat.length) {
            await updateDoc(userRef, { featuredFriends: cleanedFeat });
          }
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn("Error removing friendship from Firestore:", err);
    }
  }

  // Sync total pertemanan resmi
  await syncUserFriendCount(currentUid);
  if (resolvedFriendUid && !resolvedFriendUid.startsWith("uid_")) {
    await syncUserFriendCount(resolvedFriendUid);
  }

  triggerSocialUpdate();
}

/** Ambil ID teman yang dipilih tampil di Home */
export async function getFeaturedFriends(uid: string): Promise<string[]> {
  if (!uid || uid === "guest") return [];
  const raw = localStorage.getItem(`treenest_featured_friends_${uid}`);
  if (raw !== null) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  if (!isFirebaseConfigured || !db) {
    return [];
  }
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      const list = (data?.["featuredFriends"] as string[]) || [];
      localStorage.setItem(`treenest_featured_friends_${uid}`, JSON.stringify(list));
      return list;
    }
    return [];
  } catch (err) {
    console.error("Error getting featured friends:", err);
    return [];
  }
}

/** Simpan ID teman yang dipilih tampil di Home */
export async function updateFeaturedFriends(uid: string, featuredIds: string[]): Promise<void> {
  if (!uid || uid === "guest") return;
  localStorage.setItem(`treenest_featured_friends_${uid}`, JSON.stringify(featuredIds));
  if (!isFirebaseConfigured || !db) {
    return;
  }
  try {
    await updateDoc(doc(db, "users", uid), { featuredFriends: featuredIds });
  } catch (err) {
    console.error("Error updating featured friends:", err);
  }
}

/* ------------------------------------------------------------------ */
/* TreeGallery Service                                                */
/* ------------------------------------------------------------------ */

const GALLERY_COLLECTION = "tree_gallery";
const GALLERY_FEATURED_COLLECTION = "gallery_featured";

/** Helper sort video berdasarkan waktu disetujui (untuk approved) atau submittedAt */
function sortVideosByTime(a: GalleryVideo, b: GalleryVideo): number {
  const timeA = (a.status === "approved" && a.approvedAt ? a.approvedAt : a.submittedAt) || 0;
  const timeB = (b.status === "approved" && b.approvedAt ? b.approvedAt : b.submittedAt) || 0;
  return timeB - timeA;
}

/** Ambil semua video milik user tertentu */
export async function getUserVideos(uid: string): Promise<GalleryVideo[]> {
  if (!isFirebaseConfigured || !db) {
    // Fallback: filter localStorage by uid prefix
    const local = localStorage.getItem(`treenest_gallery_videos_${uid}`);
    if (local) {
      const list: GalleryVideo[] = JSON.parse(local);
      return list.filter((v) => !v.userDeleted).sort(sortVideosByTime);
    }
    return [];
  }
  try {
    const q = query(collection(db, GALLERY_COLLECTION), where("uid", "==", uid));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryVideo);
    return list.filter((v) => !v.userDeleted).sort(sortVideosByTime);
  } catch (err) {
    console.error("Error fetching user videos:", err);
    return [];
  }
}

/** Ambil semua video pending (untuk admin) */
export async function getAllPendingVideos(): Promise<GalleryVideo[]> {
  return getAllGalleryVideosAdmin("pending");
}

/** Ambil semua video approved (untuk galeri tayang publik) */
export async function getAllApprovedVideos(): Promise<GalleryVideo[]> {
  return getAllGalleryVideosAdmin("approved");
}

/** Ambil semua video untuk admin / publik berdasarkan filter status ("pending" | "history" | "approved" | "rejected" | "all") */
export async function getAllGalleryVideosAdmin(
  statusFilter: "pending" | "history" | "approved" | "rejected" | "all" = "all",
): Promise<GalleryVideo[]> {
  if (!isFirebaseConfigured || !db) {
    // Mode Fallback / Mock Local Storage
    const allVideos: GalleryVideo[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("treenest_gallery_videos_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: GalleryVideo[] = JSON.parse(raw);
            allVideos.push(...list);
          }
        }
      }
    } catch (err) {
      console.error("Error reading fallback local videos:", err);
    }
    const map = new Map<string, GalleryVideo>();
    allVideos.forEach((v) => map.set(v.id, v));
    let list = Array.from(map.values());
    if (statusFilter === "history") {
      list = list.filter((v) => v.status === "approved" || v.status === "rejected");
    } else if (statusFilter === "approved") {
      list = list.filter((v) => v.status === "approved" && !v.userDeleted);
    } else if (statusFilter === "pending") {
      list = list.filter((v) => v.status === "pending" && !v.userDeleted);
    } else if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter && !v.userDeleted);
    }
    return list.sort(sortVideosByTime);
  }
  try {
    let q;
    if (statusFilter === "all" || statusFilter === "history") {
      q = query(collection(db, GALLERY_COLLECTION));
    } else {
      q = query(collection(db, GALLERY_COLLECTION), where("status", "==", statusFilter));
    }
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryVideo);
    if (statusFilter === "history") {
      list = list.filter((v) => (v.status === "approved" || v.status === "rejected") && !v.adminDeletedHistory);
    } else if (statusFilter === "approved") {
      list = list.filter((v) => v.status === "approved" && !v.userDeleted);
    } else if (statusFilter === "pending") {
      list = list.filter((v) => v.status === "pending" && !v.userDeleted);
    }
    return list.sort(sortVideosByTime);
  } catch (err) {
    console.error("Error fetching admin gallery videos:", err);
    return [];
  }
}

/** Hapus riwayat video dari pandangan Admin (soft delete log) tanpa menghapus video asli pengguna */
export async function deleteGalleryVideoAdmin(videoId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, GALLERY_COLLECTION, videoId), {
        adminDeletedHistory: true
      });
    } catch (err) {
      console.error("Error soft deleting gallery video from admin history:", err);
    }
  }

  // Jangan menghapus dari localStorage atau blob storage,
  // karena video (jika statusnya 'approved') masih aktif dan dibutuhkan di TreeGallery pengguna.
}

/** Hapus SELURUH riwayat video (status: approved / rejected) oleh Admin */
export async function clearAllVideoHistoryAdmin(): Promise<void> {
  const historyVideos = await getAllGalleryVideosAdmin("history");
  for (const video of historyVideos) {
    await deleteGalleryVideoAdmin(video.id);
  }
}

/** Tambah video baru ke gallery (status: pending) */
export async function addGalleryVideo(
  uid: string,
  data: {
    title: string;
    url: string;
    sourceType: GalleryVideoSource;
    thumbnail?: string;
  },
): Promise<GalleryVideo> {
  let thumb = data.thumbnail ?? "";

  if (data.sourceType === "tiktok" && !thumb) {
    const fetchedThumb = await fetchTikTokThumbnail(data.url);
    if (fetchedThumb) thumb = fetchedThumb;
  }

  const video: GalleryVideo = {
    id: generateId(),
    uid,
    title: data.title,
    url: data.url,
    sourceType: data.sourceType,
    thumbnail: thumb,
    status: "pending",
    submittedAt: Date.now(),
  };

  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_gallery_videos_${uid}`);
    const list: GalleryVideo[] = local ? JSON.parse(local) : [];
    list.unshift(video);
    localStorage.setItem(`treenest_gallery_videos_${uid}`, JSON.stringify(list));
    return video;
  }

  try {
    const ref = doc(db, GALLERY_COLLECTION, video.id);
    await setDoc(ref, { ...video });
  } catch (err) {
    console.error("Error adding gallery video:", err);
  }
  return video;
}

/** Update status moderasi video (admin only) */
export async function moderateVideo(
  videoId: string,
  status: "approved" | "rejected",
  commentOrReason?: string,
  targetUid?: string,
  videoTitle?: string,
): Promise<void> {
  const now = Date.now();
  if (isFirebaseConfigured && db) {
    try {
      const updates: Record<string, unknown> = {
        status,
        moderatedAt: now,
      };
      if (status === "rejected") {
        updates["rejectedAt"] = now;
        if (commentOrReason) updates["reason"] = commentOrReason;
      } else if (status === "approved") {
        updates["approvedAt"] = now;
        if (commentOrReason) updates["approvalComment"] = commentOrReason;
      }
      await updateDoc(doc(db, GALLERY_COLLECTION, videoId), updates);
    } catch (err) {
      console.error("Error moderating video:", err);
    }
  }

  // Update di localStorage fallback jika ada
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("treenest_gallery_videos_")) {
        const local = localStorage.getItem(key);
        if (local) {
          const list: GalleryVideo[] = JSON.parse(local);
          let modified = false;
          const updated = list.map((v) => {
            if (v.id === videoId) {
              modified = true;
              return {
                ...v,
                status,
                approvedAt: status === "approved" ? now : v.approvedAt,
                rejectedAt: status === "rejected" ? now : v.rejectedAt,
                reason: status === "rejected" ? commentOrReason : v.reason,
                approvalComment: status === "approved" ? commentOrReason : v.approvalComment,
              };
            }
            return v;
          });
          if (modified) {
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
  } catch (err) {
    console.error("Error updating local video status:", err);
  }

  // Kirim notifikasi ke pemilik video jika targetUid tersedia
  if (targetUid) {
    addNotification({
      type: status === "approved" ? "video_approved" : "video_rejected",
      title: status === "approved" ? "Video Disetujui!" : "Video Ditolak",
      message:
        status === "approved"
          ? `Videomu "${videoTitle || 'TreeGallery'}" telah disetujui Admin!`
          : `Videomu "${videoTitle || 'TreeGallery'}" ditolak. ${commentOrReason ? `Alasan: ${commentOrReason}` : ''}`,
      link: "/treegallery",
      targetUid,
    });
  }
}

/** Hapus video oleh user (soft delete agar riwayat moderasi Admin tetap tersimpan) */
export async function deleteGalleryVideo(videoId: string, uid?: string): Promise<void> {
  // 1. Soft delete di Firestore jika dikonfigurasi
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, GALLERY_COLLECTION, videoId), {
        userDeleted: true,
        userDeletedAt: Date.now(),
      });
    } catch (err) {
      console.error("Error soft deleting gallery video in Firestore:", err);
    }
  }

  // 2. Soft delete di SELURUH key localStorage `treenest_gallery_videos_*`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("treenest_gallery_videos_")) {
        const local = localStorage.getItem(key);
        if (local) {
          const list: GalleryVideo[] = JSON.parse(local);
          let modified = false;
          const updated = list.map((v) => {
            if (v.id === videoId) {
              modified = true;
              return { ...v, userDeleted: true, userDeletedAt: Date.now() };
            }
            return v;
          });
          if (modified) {
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
  } catch (err) {
    console.error("Error updating video soft delete in localStorage:", err);
  }

  // 3. Hapus video Blob dari IndexedDB
  try {
    await deleteVideoBlob(videoId);
  } catch (err) {
    console.error("Error deleting video blob:", err);
  }

  // 4. Hapus status featured jika video ini yang dijadikan tayangan
  if (uid) {
    try {
      const featuredKey = `treenest_gallery_featured_${uid}`;
      const featured = localStorage.getItem(featuredKey);
      if (featured && featured.includes(videoId)) {
        localStorage.removeItem(featuredKey);
      }
    } catch (err) {
      console.error("Error clearing featured video from localStorage:", err);
    }
  }
}

/** Set / unset video unggulan di Rumah Pohon */
export async function setFeaturedVideo(uid: string, videoId: string | null): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    localStorage.setItem(`treenest_gallery_featured_${uid}`, JSON.stringify(videoId));
    return;
  }
  try {
    const ref = doc(db, GALLERY_FEATURED_COLLECTION, uid);
    await setDoc(ref, { videoId, updatedAt: Date.now() });
  } catch (err) {
    console.error("Error setting featured video:", err);
  }
}

/** Ambil ID video unggulan user */
export async function getFeaturedVideoId(uid: string): Promise<string | null> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_gallery_featured_${uid}`);
    return local ? JSON.parse(local) : null;
  }
  try {
    const snap = await getDoc(doc(db, GALLERY_FEATURED_COLLECTION, uid));
    if (snap.exists()) {
      const data = snap.data();
      return (data?.["videoId"] as string | null) ?? null;
    }
    return null;
  } catch (err) {
    console.error("Error fetching featured video:", err);
    return null;
  }
}

export interface TreehouseViewer {
  uid: string;
  accountId: string;
  name: string;
  initials: string;
  hue: number;
  avatarUrl?: string | undefined;
  viewedAt: number;
}

const TREEHOUSE_VIEWERS_SUBCOLLECTION = "treehouse_viewers";

/** Catat bahwa user tertentu telah menonton video yang dipamerkan di Rumah Pohon (terikat pada videoId spesifik) */
export async function recordTreehouseVideoView(
  ownerUid: string,
  videoId: string,
  viewer: {
    uid: string;
    accountId: string;
    name: string;
    initials: string;
    hue: number;
    avatarUrl?: string | undefined;
  },
): Promise<void> {
  if (!ownerUid || !videoId || !viewer.uid || viewer.uid === "guest" || viewer.uid === ownerUid) return;

  const now = Date.now();
  const viewerData: TreehouseViewer = {
    uid: viewer.uid,
    accountId: viewer.accountId,
    name: viewer.name,
    initials: viewer.initials,
    hue: viewer.hue,
    avatarUrl: viewer.avatarUrl || undefined,
    viewedAt: now,
  };

  // 1. Simpan di Local Storage KHUSUS untuk videoId ini
  try {
    const storageKey = `treenest_treehouse_viewers_${ownerUid}_${videoId}`;
    const raw = localStorage.getItem(storageKey);
    let list: TreehouseViewer[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((v) => v.uid === viewer.uid || v.accountId === viewer.accountId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...viewerData };
    } else {
      list.unshift(viewerData);
    }
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch (err) {
    console.warn("Local storage record treehouse viewer notice:", err);
  }

  if (!isFirebaseConfigured || !db) return;

  // 2. Simpan di Firestore KHUSUS untuk videoId ini
  try {
    const docId = `${viewer.uid}_${videoId}`;
    const viewerDocRef = doc(db, "users", ownerUid, TREEHOUSE_VIEWERS_SUBCOLLECTION, docId);
    await setDoc(viewerDocRef, { ...viewerData, videoId }, { merge: true });
  } catch (err) {
    console.warn("Firestore record treehouse viewer notice:", err);
  }
}

/** Ambil daftar user yang telah menonton video yang dipamerkan di Rumah Pohon (terikat pada videoId spesifik) */
export async function getTreehouseVideoViewers(
  ownerUid: string,
  videoId?: string | null,
): Promise<TreehouseViewer[]> {
  if (!ownerUid || ownerUid === "guest" || !videoId) return [];

  const viewersMap = new Map<string, TreehouseViewer>();

  // 1. Ambil dari Local Storage KHUSUS untuk videoId ini
  try {
    const storageKey = `treenest_treehouse_viewers_${ownerUid}_${videoId}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const list: TreehouseViewer[] = JSON.parse(raw);
      list.forEach((v) => viewersMap.set(v.accountId || v.uid, v));
    }
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) {
    return Array.from(viewersMap.values()).sort((a, b) => b.viewedAt - a.viewedAt);
  }

  // 2. Ambil dari Firestore KHUSUS untuk videoId ini
  try {
    const q = query(
      collection(db, "users", ownerUid, TREEHOUSE_VIEWERS_SUBCOLLECTION),
      where("videoId", "==", videoId),
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data() as TreehouseViewer & { videoId?: string };
      viewersMap.set(data.accountId || data.uid, {
        uid: data.uid,
        accountId: data.accountId,
        name: data.name,
        initials: data.initials,
        hue: data.hue,
        avatarUrl: data.avatarUrl || undefined,
        viewedAt: data.viewedAt || 0,
      });
    });
  } catch (err) {
    console.warn("Firestore get treehouse viewers notice:", err);
  }

  return Array.from(viewersMap.values()).sort((a, b) => b.viewedAt - a.viewedAt);
}

/* ------------------------------------------------------------------ */
/* Admin Management & Monitoring Services                             */
/* ------------------------------------------------------------------ */

/** Mengambil seluruh profil user terdaftar untuk panel admin */
export async function getAllUsersAdmin(): Promise<UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();

  // 1. Ambil dari local storage (fallback / offline)
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("treenest_user_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const u = JSON.parse(raw) as UserProfile;
            if (u && u.uid) {
              usersMap.set(u.uid, u);
            }
          }
        }
      }
    } catch {}
  }

  // 2. Ambil dari Firestore jika aktif
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "users"));
      snap.docs.forEach((d) => {
        const data = d.data() as UserProfile;
        usersMap.set(d.id, {
          ...data,
          uid: d.id,
        });
      });
    } catch (err) {
      console.error("Error fetching all users admin from Firestore:", err);
    }
  }

  const list = Array.from(usersMap.values());
  list.sort((a, b) => (b.totalLogins || 0) - (a.totalLogins || 0) || (b.exp || 0) - (a.exp || 0));
  return list;
}

/** Meng-suspend / memblokir user (hanya admin) */
export async function suspendUserAdmin(
  targetUid: string,
  reason: string,
  adminUid: string
): Promise<{ success: boolean; error?: string }> {
  if (!targetUid) return { success: false, error: "UID pengguna tidak valid" };

  const suspendData = {
    isSuspended: true,
    suspendReason: reason || "Melanggar ketentuan penggunaan TreeNest.",
    suspendedAt: Date.now(),
    suspendedBy: adminUid,
  };

  // Local storage update
  if (typeof window !== "undefined") {
    try {
      const localKey = `treenest_user_${targetUid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(localKey, JSON.stringify({ ...parsed, ...suspendData }));
      }
    } catch {}
  }

  // Firestore update
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", targetUid), suspendData, { merge: true });
    } catch (err: any) {
      console.error("Error suspending user in Firestore:", err);
      return { success: false, error: err?.message || "Gagal meng-suspend pengguna di Firestore" };
    }
  }

  triggerSocialUpdate();
  return { success: true };
}

/** Membatalkan suspend / memulihkan user (hanya admin) */
export async function unsuspendUserAdmin(
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  if (!targetUid) return { success: false, error: "UID pengguna tidak valid" };

  const unsuspendData = {
    isSuspended: false,
    suspendReason: "",
    suspendedAt: null,
    suspendedBy: null,
  };

  // Local storage update
  if (typeof window !== "undefined") {
    try {
      const localKey = `treenest_user_${targetUid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(localKey, JSON.stringify({ ...parsed, ...unsuspendData }));
      }
    } catch {}
  }

  // Firestore update
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", targetUid), unsuspendData, { merge: true });
    } catch (err: any) {
      console.error("Error unsuspending user in Firestore:", err);
      return { success: false, error: err?.message || "Gagal memulihkan pengguna di Firestore" };
    }
  }

  triggerSocialUpdate();
  return { success: true };
}

/** Menghapus akun user secara permanen (hanya admin) */
export async function deleteUserAdmin(
  targetUid: string
): Promise<{ success: boolean; error?: string }> {
  if (!targetUid) return { success: false, error: "UID pengguna tidak valid" };
  try {
    await deleteUserAccountFully(targetUid);
    triggerSocialUpdate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Gagal menghapus pengguna" };
  }
}

/** Mengubah role akun user (user / admin) */
export async function updateUserRoleAdmin(
  targetUid: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!targetUid) return { success: false, error: "UID pengguna tidak valid" };

  // Local storage update
  if (typeof window !== "undefined") {
    try {
      const localKey = `treenest_user_${targetUid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(localKey, JSON.stringify({ ...parsed, role: newRole }));
      }
    } catch {}
  }

  // Firestore update
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "users", targetUid), { role: newRole }, { merge: true });
    } catch (err: any) {
      console.error("Error updating user role in Firestore:", err);
      return { success: false, error: err?.message || "Gagal memperbarui peran pengguna" };
    }
  }

  triggerSocialUpdate();
  return { success: true };
}

/** Mengambil metrik sistem ringkasan untuk admin */
export async function getSystemMetricsAdmin(): Promise<{
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalVideos: number;
  pendingVideos: number;
  approvedVideos: number;
}> {
  const [users, pendingVideos, allVideos] = await Promise.all([
    getAllUsersAdmin(),
    getAllGalleryVideosAdmin("pending"),
    getAllGalleryVideosAdmin("history"),
  ]);

  const totalUsers = users.length;
  const suspendedUsers = users.filter((u) => Boolean(u.isSuspended)).length;
  const activeUsers = totalUsers - suspendedUsers;

  const totalVideos = pendingVideos.length + allVideos.length;
  const pendingCount = pendingVideos.length;
  const approvedCount = allVideos.filter((v) => v.status === "approved").length;

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalVideos,
    pendingVideos: pendingCount,
    approvedVideos: approvedCount,
  };
}
