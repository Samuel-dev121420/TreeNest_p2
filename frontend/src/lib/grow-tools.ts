export type PinoteItemType = "folder" | "note" | "file";

export type PinoteItem = {
  id: string;
  parentId: string | null;
  name: string;
  type: PinoteItemType;
  content?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: number;
  updatedAt: number;
};

// Legacy types for compatibility
export type PinoteFolder = {
  id: string;
  name: string;
  createdAt: number;
};

export type PinoteNote = {
  id: string;
  folderId: string;
  title: string;
  content: string;
  updatedAt: number;
};

export type FlashDeck = {
  id: string;
  name: string;
  createdAt: number;
};

export type FlashCard = {
  id: string;
  deckId: string;
  title?: string;
  front: string;
  back: string;
  createdAt: number;
};

export type StudySession = {
  id: string;
  duration: number; // minutes
  completedAt: number;
};

export type DailyTask = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  done: boolean;
  createdAt: number;
};

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function hasUncheckedReminders(uid: string): boolean {
  try {
    const key = `treenest.dailytask.tasks.${uid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const tasks: DailyTask[] = JSON.parse(raw);
    const today = todayKey();
    return tasks.some((t) => !t.done && t.date <= today);
  } catch {
    return false;
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
