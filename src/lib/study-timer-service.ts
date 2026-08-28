import { awardActivityExp } from "@/lib/exp-service";
import { generateId, type StudySession } from "@/lib/grow-tools";

export type StudyTimerState = {
  status: "idle" | "running" | "paused" | "completed";
  durationMinutes: number;
  endTimeMs: number;
  pausedSecondsLeft: number;
  completedAt?: number;
  sessionSaved?: boolean;
};

const STORAGE_KEY = "treenest_active_study_timer";
const LISTENERS = new Set<() => void>();

function getRawTimerState(): StudyTimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    status: "idle",
    durationMinutes: 25,
    endTimeMs: 0,
    pausedSecondsLeft: 25 * 60,
  };
}

function saveTimerState(state: StudyTimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  LISTENERS.forEach((fn) => fn());
}

export function subscribeStudyTimer(listener: () => void) {
  LISTENERS.add(listener);
  return () => {
    LISTENERS.delete(listener);
  };
}

export function getStudyTimerSnapshot(): StudyTimerState & { secondsLeft: number } {
  const state = getRawTimerState();
  if (state.status === "running") {
    const now = Date.now();
    const remainingSec = Math.max(0, Math.ceil((state.endTimeMs - now) / 1000));
    if (remainingSec === 0) {
      const completedState: StudyTimerState = {
        ...state,
        status: "completed",
        completedAt: Date.now(),
        sessionSaved: false,
      };
      saveTimerState(completedState);
      return { ...completedState, secondsLeft: 0 };
    }
    return { ...state, secondsLeft: remainingSec };
  } else if (state.status === "paused") {
    return { ...state, secondsLeft: state.pausedSecondsLeft };
  } else if (state.status === "completed") {
    return { ...state, secondsLeft: 0 };
  } else {
    return { ...state, secondsLeft: state.durationMinutes * 60 };
  }
}

export function startStudyTimer(durationMinutes: number) {
  const endTimeMs = Date.now() + durationMinutes * 60 * 1000;
  const state: StudyTimerState = {
    status: "running",
    durationMinutes,
    endTimeMs,
    pausedSecondsLeft: 0,
  };
  saveTimerState(state);
}

export function pauseStudyTimer() {
  const snap = getStudyTimerSnapshot();
  if (snap.status === "running") {
    const state: StudyTimerState = {
      ...snap,
      status: "paused",
      pausedSecondsLeft: snap.secondsLeft,
    };
    saveTimerState(state);
  }
}

export function resumeStudyTimer() {
  const snap = getStudyTimerSnapshot();
  if (snap.status === "paused") {
    const endTimeMs = Date.now() + snap.pausedSecondsLeft * 1000;
    const state: StudyTimerState = {
      ...snap,
      status: "running",
      endTimeMs,
    };
    saveTimerState(state);
  }
}

export function resetStudyTimer(durationMinutes?: number) {
  const current = getRawTimerState();
  const dur = durationMinutes ?? current.durationMinutes ?? 25;
  const state: StudyTimerState = {
    status: "idle",
    durationMinutes: dur,
    endTimeMs: 0,
    pausedSecondsLeft: dur * 60,
  };
  saveTimerState(state);
}

export function markStudySessionSaved(uid: string) {
  const state = getRawTimerState();
  if (state.status === "completed" && !state.sessionSaved) {
    saveTimerState({ ...state, sessionSaved: true });

    // Auto save to history
    try {
      const key = `treenest.study.sessions.${uid}`;
      const local = localStorage.getItem(key);
      const list: StudySession[] = local ? JSON.parse(local) : [];
      list.unshift({
        id: generateId(),
        duration: state.durationMinutes,
        completedAt: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch {
      // ignore
    }

    if (uid !== "guest") {
      awardActivityExp(uid, "study").catch(() => {});
    }
  }
}
