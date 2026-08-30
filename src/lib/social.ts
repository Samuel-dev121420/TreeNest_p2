import { generateId } from "./grow-tools";

/* ------------------------------------------------------------------ */
/* Friend Club                                                         */
/* ------------------------------------------------------------------ */

export type Person = {
  uid?: string | undefined;
  accountId: string;
  name: string;
  initials: string;
  hue: number;
  avatarUrl?: string | undefined;
};

export type Friend = Person & {
  id: string;
  since: number;
};

export type FriendRequest = {
  id: string;
  from: Person;
  createdAt: number;
  status: "pending" | "accepted" | "rejected";
};

export type SentRequest = {
  id: string;
  to: Person;
  createdAt: number;
  status: "pending" | "accepted" | "rejected";
};

/** Pengguna yang bisa ditemukan lewat Cari Teman (data demo statis). */
export const SEARCHABLE_USERS: Person[] = [];

/** Teman awal (kosong secara default jika belum berteman). */
export function seedFriends(): Friend[] {
  return [];
}

export function seedRequests(): FriendRequest[] {
  return [];
}

export function seedSent(): SentRequest[] {
  return [];
}

/** Batas teman yang tampil di Home page. */
export const MAX_FEATURED = 5;

/* ------------------------------------------------------------------ */
/* TreeGallery                                                         */
/* ------------------------------------------------------------------ */

export type GalleryVideoSource = "youtube" | "tiktok" | "upload" | "link";

export type GalleryVideo = {
  id: string;
  uid: string; // owner user id
  title: string;
  /** YouTube URL, TikTok URL, Firebase Storage URL, atau link lain */
  url: string;
  sourceType: GalleryVideoSource;
  thumbnail: string;
  status: "pending" | "approved" | "rejected";
  reason?: string | undefined;
  approvalComment?: string | undefined;
  submittedAt: number;
  userDeleted?: boolean | undefined;
  userDeletedAt?: number | undefined;
};

export const MAX_VIDEOS = 999999;
export const MAX_DURATION_SEC = 180; // 3 menit maksimal untuk file upload
export const MAX_FILE_MB = 50; // 50 MB maksimal ukuran file

export function seedVideos(): GalleryVideo[] {
  return [
    {
      id: "seed-1",
      uid: "demo",
      title: "Belajar bareng di taman",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sourceType: "youtube",
      thumbnail: "",
      status: "approved",
      submittedAt: Date.now() - 86400000 * 4,
    },
    {
      id: "seed-2",
      uid: "demo",
      title: "Time-lapse pohon tumbuh",
      url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      sourceType: "youtube",
      thumbnail: "",
      status: "pending",
      submittedAt: Date.now() - 3600000 * 20,
    },
    {
      id: "seed-3",
      uid: "demo",
      title: "Vlog sarapan pagi",
      url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
      sourceType: "youtube",
      thumbnail: "",
      status: "rejected",
      reason: "Durasi melebihi 30 detik.",
      submittedAt: Date.now() - 86400000 * 9,
    },
  ];
}

/** Deteksi platform dari URL. */
export function detectSource(url: string): GalleryVideoSource {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/firebasestorage\.googleapis\.com|blob:/.test(url)) return "upload";
  return "link";
}

/** Ambil ID video YouTube dari berbagai format URL. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1] ?? null;
  }
  return null;
}

/** Ambil ID video TikTok dari berbagai format URL. */
export function tiktokId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:tiktok\.com\/@[\w.-]+\/video\/)(\d+)/,
    /(?:tiktok\.com\/embed\/v2\/)(\d+)/,
    /(?:tiktok\.com\/embed\/)(\d+)/,
    /(?:tiktok\.com\/v\/)(\d+)/,
    /(?:tiktok\.com\/t\/)(\w+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1] ?? null;
  }
  return null;
}

/** Ambil URL thumbnail/cover video dari TikTok via oEmbed API. */
export async function fetchTikTokThumbnail(url: string): Promise<string | null> {
  if (!url || !url.includes("tiktok.com")) return null;
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || data.cover_url || null;
  } catch {
    return null;
  }
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export type SocialPlatform = "whatsapp" | "tiktok" | "x" | "instagram" | "github";
export type VisibilityLevel = "public" | "friends_only" | "private";

export type SocialLink = {
  platform: SocialPlatform;
  value: string;
  visibility: VisibilityLevel;
};

export type Profile = {
  username: string;
  accountId: string;
  email: string;
  bio: string;
  initials: string;
  hue: number;
  level: number;
  exp: number;
  friendCount: number;
  avatarUrl?: string | undefined;
  totalLogins?: number | undefined;
  loginDates?: string[] | undefined;
  socialLinks?: SocialLink[] | undefined;
  themePreference?: ("light" | "dark") | undefined;
  treehouseVideoPrivacy?: ("public" | "friends" | "private") | undefined;
};

export function seedProfile(): Profile {
  return {
    username: "Rafi",
    accountId: "TN-4821",
    email: "—",
    bio: "Tumbuh pelan, tapi pasti. 🌱",
    initials: "RA",
    hue: 150,
    level: 8,
    exp: 32,
    friendCount: 3,
    avatarUrl: "",
    totalLogins: 1,
    socialLinks: [],
    themePreference: "light",
  };
}
