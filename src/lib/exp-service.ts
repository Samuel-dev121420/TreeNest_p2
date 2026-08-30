import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { getUserProfile, updateUserExpAndLevel } from "./firestore-service";

export type DailyQuestState = {
  date: string; // YYYY-MM-DD
  loginDone: boolean; // max 1 (15 EXP)
  pinoteCount: number; // max 3 shared between note creation & file upload (5 EXP each, max 15 EXP)
  flashcardCount: number; // max 3 (5 EXP each, max 15 EXP)
  studyCount: number; // max 3 (5 EXP each, max 15 EXP)
  galleryCount: number; // max 3 (10 EXP each, max 30 EXP)
  friendCount: number; // total friends awarded EXP
  awardedFriendIds: string[]; // unique friend uids/accountIds
};

export type ActivityType =
  "daily_login" | "pinote_note" | "pinote_file" | "flashcard" | "study" | "gallery" | "add_friend";

export type ExpAwardResult = {
  gainedExp: number;
  newLevel: number;
  newExp: number;
  leveledUp: boolean;
  message: string;
};

export type ToastNotice = {
  id: string;
  type: "exp" | "levelup";
  title: string;
  subtitle: string;
};

/** Get today's YYYY-MM-DD key */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialQuestState(date = getTodayKey()): DailyQuestState {
  return {
    date,
    loginDone: false,
    pinoteCount: 0,
    flashcardCount: 0,
    studyCount: 0,
    galleryCount: 0,
    friendCount: 0,
    awardedFriendIds: [],
  };
}

// ── Real-time Event System ──────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeExpUpdates(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// Toast notification subscribers
type ToastListener = (toast: ToastNotice) => void;
const toastListeners = new Set<ToastListener>();

export function subscribeToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

export function emitToast(toast: ToastNotice) {
  toastListeners.forEach((fn) => fn(toast));
}

// ── Daily Quest Storage & Retrieval ─────────────────────────────────

export async function getDailyQuestState(uid: string): Promise<DailyQuestState> {
  const dateKey = getTodayKey();
  const lsKey = `treenest_quests_${uid}_${dateKey}`;

  if (!isFirebaseConfigured || !db) {
    const local = localStorage.getItem(lsKey);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        // ignore error
      }
    }
    const initial = createInitialQuestState(dateKey);
    localStorage.setItem(lsKey, JSON.stringify(initial));
    return initial;
  }

  try {
    const qRef = doc(db, "users", uid, "daily_quests", dateKey);
    const snap = await getDoc(qRef);
    if (snap.exists()) {
      return snap.data() as DailyQuestState;
    }
    const initial = createInitialQuestState(dateKey);
    await setDoc(qRef, initial);
    localStorage.setItem(lsKey, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error("Error fetching daily quest state:", err);
    const local = localStorage.getItem(lsKey);
    if (local) return JSON.parse(local);
    return createInitialQuestState(dateKey);
  }
}

async function saveDailyQuestState(uid: string, questState: DailyQuestState): Promise<void> {
  const dateKey = questState.date;
  const lsKey = `treenest_quests_${uid}_${dateKey}`;
  localStorage.setItem(lsKey, JSON.stringify(questState));

  if (isFirebaseConfigured && db) {
    try {
      const qRef = doc(db, "users", uid, "daily_quests", dateKey);
      await setDoc(qRef, questState);
    } catch (err) {
      console.error("Error saving daily quest state:", err);
    }
  }
}

// ── Award Activity EXP ──────────────────────────────────────────────

export async function awardActivityExp(
  uid: string,
  activity: ActivityType,
  extraId?: string,
): Promise<ExpAwardResult | null> {
  if (!uid || uid === "guest") return null;

  const profile = await getUserProfile(uid);
  if (!profile) return null;

  const questState = await getDailyQuestState(uid);
  let gainedExp = 0;
  let activityLabel = "";

  // Evaluate activity rules
  switch (activity) {
    case "daily_login": {
      if (!questState.loginDone) {
        gainedExp = 15;
        questState.loginDone = true;
        activityLabel = "Daily Login (+15 EXP)";
      }
      break;
    }
    case "pinote_note":
    case "pinote_file": {
      if (questState.pinoteCount < 3) {
        gainedExp = 5;
        questState.pinoteCount += 1;
        activityLabel =
          activity === "pinote_note" ? "Catatan PiNote (+5 EXP)" : "Upload File PiNote (+5 EXP)";
      }
      break;
    }
    case "flashcard": {
      if (questState.flashcardCount < 3) {
        gainedExp = 5;
        questState.flashcardCount += 1;
        activityLabel = "Membuat FlashCard (+5 EXP)";
      }
      break;
    }
    case "study": {
      if (questState.studyCount < 3) {
        gainedExp = 5;
        questState.studyCount += 1;
        activityLabel = "Selesai Study Session (+5 EXP)";
      }
      break;
    }
    case "gallery": {
      if (questState.galleryCount < 3) {
        gainedExp = 10;
        questState.galleryCount += 1;
        activityLabel = "Upload Video TreeGallery (+10 EXP)";
      }
      break;
    }
    case "add_friend": {
      const friendId = extraId?.trim();
      if (friendId && !questState.awardedFriendIds.includes(friendId)) {
        gainedExp = 15;
        questState.friendCount += 1;
        questState.awardedFriendIds.push(friendId);
        activityLabel = "Menambah Teman Baru (+15 EXP)";
      }
      break;
    }
  }

  // If no EXP was earned (e.g. limit reached or duplicate friend), return null
  if (gainedExp <= 0) {
    return null;
  }

  // Level & EXP calculation
  // Fixed 50 EXP per level. Reaching 50/50 resets EXP to 0/50 (excess NOT carried over as per spec).
  const currentExp = profile.exp || 0;
  const currentLevel = profile.level || 1;
  const totalExp = currentExp + gainedExp;

  let newLevel = currentLevel;
  let newExp = totalExp;
  let leveledUp = false;

  if (totalExp >= 50) {
    if (currentLevel >= 20) {
      newLevel = 20;
      newExp = 50;
      leveledUp = false;
    } else {
      newLevel = Math.min(20, currentLevel + 1);
      newExp = 0; // Reset to 0/50 EXP (excess not carried over)
      leveledUp = true;
    }
  } else if (currentLevel >= 20) {
    newLevel = 20;
  }

  // Save changes
  await Promise.all([
    updateUserExpAndLevel(uid, newLevel, newExp),
    saveDailyQuestState(uid, questState),
  ]);

  // Dispatch toast notice (HANYA jika level pengguna belum mencapai Level Max 20)
  if (currentLevel < 20) {
    emitToast({
      id: `toast_${Date.now()}_${Math.random()}`,
      type: leveledUp ? "levelup" : "exp",
      title: leveledUp ? `Naik Level! 🎉 Level ${newLevel}` : `+${gainedExp} EXP! 🌱`,
      subtitle: activityLabel,
    });
  }

  // Notify listeners to update real-time UI
  notifyListeners();

  return {
    gainedExp,
    newLevel,
    newExp,
    leveledUp,
    message: activityLabel,
  };
}
