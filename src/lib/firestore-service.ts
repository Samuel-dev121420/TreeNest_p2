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
} from "./social";
import { generateId } from "./grow-tools";

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
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) return JSON.parse(local);
    const initial = seedProfile();
    const mockUser: UserProfile = {
      ...initial,
      uid,
      role: uid === "admin-demo-id" ? "admin" : "user",
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
      return data;
    }
    return null;
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
}

export async function createUserProfile(
  uid: string,
  username: string,
  email: string,
  role: UserRole = "user",
): Promise<UserProfile> {
  // Auto-assign admin role berdasarkan VITE_ADMIN_EMAIL
  const resolvedRole: UserRole = isAdminEmail(email) ? "admin" : role;
  const accountId = generateAccountId();
  const initials = username.slice(0, 2).toUpperCase();
  const hue = Math.floor(Math.random() * 360);

  const profile: UserProfile = {
    uid,
    username,
    accountId,
    email,
    bio: "Tumbuh pelan, tapi pasti. 🌱",
    initials,
    hue,
    level: 1,
    exp: 0,
    friendCount: 0,
    role: resolvedRole,
    featuredFriends: [],
  };

  if (!isFirebaseConfigured || !db) {
    localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(profile));
    return profile;
  }

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { ...profile, createdAt: Date.now() });
  } catch (err) {
    console.error("Error creating user profile in Firestore:", err);
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

export async function updateUserProfile(
  uid: string,
  patch: { username?: string; bio?: string },
): Promise<void> {
  const initials = patch.username?.slice(0, 2).toUpperCase();

  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_user_${uid}`);
    if (local) {
      const data = JSON.parse(local);
      if (patch.username !== undefined) {
        data.username = patch.username;
        data.initials = initials;
      }
      if (patch.bio !== undefined) data.bio = patch.bio;
      localStorage.setItem(`treenest_user_${uid}`, JSON.stringify(data));
    }
    return;
  }

  try {
    const userRef = doc(db, "users", uid);
    const updates: Record<string, string> = {};
    if (patch.username !== undefined) {
      updates.username = patch.username;
      if (initials) updates.initials = initials;
    }
    if (patch.bio !== undefined) updates.bio = patch.bio;
    await updateDoc(userRef, updates);
  } catch (err) {
    console.error("Error updating user profile:", err);
  }
}

/* ------------------------------------------------------------------ */
/* Search & Friend System                                             */
/* ------------------------------------------------------------------ */

export async function searchUserByAccountId(accountId: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const q = query(
      collection(db, "users"),
      where("accountId", "==", accountId.trim().toUpperCase()),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      if (docSnap) return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error("Error searching user:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* TreeGallery Service                                                */
/* ------------------------------------------------------------------ */

const GALLERY_COLLECTION = "tree_gallery";
const GALLERY_FEATURED_COLLECTION = "gallery_featured";

/** Ambil semua video milik user tertentu */
export async function getUserVideos(uid: string): Promise<GalleryVideo[]> {
  if (!isFirebaseConfigured || !db) {
    // Fallback: filter localStorage by uid prefix
    const local = localStorage.getItem(`treenest_gallery_videos_${uid}`);
    if (local) return JSON.parse(local);
    return [];
  }
  try {
    const q = query(
      collection(db, GALLERY_COLLECTION),
      where("uid", "==", uid),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryVideo);
    return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (err) {
    console.error("Error fetching user videos:", err);
    return [];
  }
}

/** Ambil semua video pending (untuk admin) */
export async function getAllPendingVideos(): Promise<GalleryVideo[]> {
  return getAllGalleryVideosAdmin("pending");
}

/** Ambil semua video untuk admin berdasarkan filter status ("pending" | "approved" | "rejected" | "all") */
export async function getAllGalleryVideosAdmin(
  statusFilter: "pending" | "approved" | "rejected" | "all" = "all",
): Promise<GalleryVideo[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    let q;
    if (statusFilter === "all") {
      q = query(collection(db, GALLERY_COLLECTION));
    } else {
      q = query(
        collection(db, GALLERY_COLLECTION),
        where("status", "==", statusFilter),
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryVideo);
    return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (err) {
    console.error("Error fetching admin gallery videos:", err);
    return [];
  }
}

/** Hapus video oleh Admin dari database */
export async function deleteGalleryVideoAdmin(videoId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, GALLERY_COLLECTION, videoId));
  } catch (err) {
    console.error("Error deleting video by admin:", err);
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
  const video: GalleryVideo = {
    id: generateId(),
    uid,
    title: data.title,
    url: data.url,
    sourceType: data.sourceType,
    thumbnail: data.thumbnail ?? "",
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
  reason?: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const updates: Record<string, unknown> = { status, moderatedAt: Date.now() };
    if (reason) updates.reason = reason;
    else if (status === "approved") updates.reason = "";
    await updateDoc(doc(db, GALLERY_COLLECTION, videoId), updates);
  } catch (err) {
    console.error("Error moderating video:", err);
  }
}

/** Hapus video */
export async function deleteGalleryVideo(videoId: string, uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(`treenest_gallery_videos_${uid}`);
    if (local) {
      const list: GalleryVideo[] = JSON.parse(local);
      localStorage.setItem(
        `treenest_gallery_videos_${uid}`,
        JSON.stringify(list.filter((v) => v.id !== videoId)),
      );
    }
    return;
  }
  try {
    await deleteDoc(doc(db, GALLERY_COLLECTION, videoId));
  } catch (err) {
    console.error("Error deleting gallery video:", err);
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
    if (snap.exists()) return snap.data().videoId as string | null;
    return null;
  } catch (err) {
    console.error("Error fetching featured video:", err);
    return null;
  }
}
