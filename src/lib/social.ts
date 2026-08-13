import { generateId } from "./grow-tools";

/* ------------------------------------------------------------------ */
/* Friend Club                                                         */
/* ------------------------------------------------------------------ */

export type Person = {
  accountId: string;
  name: string;
  initials: string;
  hue: number;
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
export const SEARCHABLE_USERS: Person[] = [
  { accountId: "TN-1024", name: "Dewi Lestari", initials: "DE", hue: 320 },
  { accountId: "TN-2098", name: "Arga Wijaya", initials: "AR", hue: 280 },
  { accountId: "TN-3310", name: "Lukman Hakim", initials: "LU", hue: 100 },
  { accountId: "TN-4521", name: "Maya Sari", initials: "MA", hue: 200 },
  { accountId: "TN-5762", name: "Rendi Pratama", initials: "RE", hue: 40 },
  { accountId: "TN-6840", name: "Putri Anggraini", initials: "PU", hue: 350 },
  { accountId: "TN-7901", name: "Bayu Nugroho", initials: "BA", hue: 160 },
];

/** Teman awal (selaras dengan DEMO_FRIENDS di home page). */
export function seedFriends(): Friend[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      accountId: "TN-9901",
      name: "Nadia",
      initials: "NA",
      hue: 200,
      since: now - 86400000 * 12,
    },
    {
      id: generateId(),
      accountId: "TN-9902",
      name: "Bima",
      initials: "BI",
      hue: 140,
      since: now - 86400000 * 7,
    },
    {
      id: generateId(),
      accountId: "TN-9903",
      name: "Sari",
      initials: "SA",
      hue: 60,
      since: now - 86400000 * 3,
    },
  ];
}

export function seedRequests(): FriendRequest[] {
  return [
    {
      id: generateId(),
      from: { accountId: "TN-1024", name: "Dewi Lestari", initials: "DE", hue: 320 },
      createdAt: Date.now() - 3600000 * 5,
      status: "pending",
    },
    {
      id: generateId(),
      from: { accountId: "TN-7901", name: "Bayu Nugroho", initials: "BA", hue: 160 },
      createdAt: Date.now() - 3600000 * 26,
      status: "pending",
    },
  ];
}

export function seedSent(): SentRequest[] {
  return [
    {
      id: generateId(),
      to: { accountId: "TN-2098", name: "Arga Wijaya", initials: "AR", hue: 280 },
      createdAt: Date.now() - 3600000 * 9,
      status: "pending",
    },
  ];
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
  reason?: string;
  submittedAt: number;
};

export const MAX_VIDEOS = 3;
export const MAX_DURATION_SEC = 30;

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
  };
}
