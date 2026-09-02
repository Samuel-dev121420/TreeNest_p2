import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Play, Pause, RotateCcw, Sparkles, Trash2, CloudRain, Trees, Flame, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { type StudySession } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import {
  getStudyTimerSnapshot,
  startStudyTimer,
  pauseStudyTimer,
  resumeStudyTimer,
  resetStudyTimer,
  markStudySessionSaved,
  subscribeStudyTimer,
} from "@/lib/study-timer-service";
import { ambientSound, playFocusBell, playTapPop, type AmbientSoundType } from "@/lib/sound-fx";

export const Route = createFileRoute("/grow/study")({
  head: () => ({
    meta: [
      { title: "Study Session — Fokus Belajar TreeNest" },
      { name: "description", content: "Timer fokus belajar dengan durasi custom di TreeNest." },
      { property: "og:title", content: "Study Session — Fokus Belajar TreeNest" },
      {
        property: "og:description",
        content: "Timer fokus belajar dengan durasi custom di TreeNest.",
      },
    ],
  }),
  component: StudyPage,
});

const PRESETS = [15, 25, 45, 60];

function StudyPage() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [sessions, setSessions] = useLocalStorage<StudySession[]>(
    `treenest.study.sessions.${uid}`,
    [],
  );

  const [timerSnap, setTimerSnap] = useState(getStudyTimerSnapshot());
  const [selectedMinutes, setSelectedMinutes] = useState(timerSnap.durationMinutes || 25);
  const [ambientType, setAmbientType] = useState<AmbientSoundType>("none");

  useEffect(() => {
    const update = () => {
      const snap = getStudyTimerSnapshot();
      setTimerSnap(snap);
      if (snap.status === "completed") {
        markStudySessionSaved(uid);
        playFocusBell();
        ambientSound.stop();
        setAmbientType("none");
      }
    };
    update();
    const unsub = subscribeStudyTimer(update);
    const interval = setInterval(update, 1000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [uid]);

  // Clean up ambient sound on unmount
  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  const totalSeconds = (selectedMinutes || 25) * 60;
  const secondsLeft = timerSnap.secondsLeft;
  const finished = timerSnap.status === "completed";
  const running = timerSnap.status === "running";

  const progress = useMemo(() => {
    if (finished) return 100;
    const elapsed = totalSeconds - secondsLeft;
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
  }, [finished, totalSeconds, secondsLeft]);

  function formatTime(totalSec: number) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function handleStartPause() {
    playTapPop(1);
    if (running) {
      pauseStudyTimer();
      ambientSound.stop();
    } else if (timerSnap.status === "paused") {
      resumeStudyTimer();
      if (ambientType !== "none") ambientSound.play(ambientType);
    } else {
      startStudyTimer(selectedMinutes);
      if (ambientType !== "none") ambientSound.play(ambientType);
    }
  }

  function handleReset() {
    playTapPop(0);
    ambientSound.stop();
    resetStudyTimer(selectedMinutes);
  }

  function changeDuration(minutes: number) {
    playTapPop(0);
    const valid = Math.max(1, Math.min(180, minutes));
    setSelectedMinutes(valid);
    resetStudyTimer(valid);
  }

  function toggleAmbient(type: AmbientSoundType) {
    playTapPop(1);
    if (ambientType === type) {
      setAmbientType("none");
      ambientSound.stop();
    } else {
      setAmbientType(type);
      ambientSound.play(type);
    }
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="Study Session"
        description="Atur durasi fokus, dengarkan suara alam relaksasi, dan tumbuhkan fokusmu."
      />

      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {/* Timer ring with Breathing Aura */}
        <motion.div
          animate={
            running
              ? {
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    "0 0 20px rgba(16,185,129,0.15)",
                    "0 0 45px rgba(16,185,129,0.35)",
                    "0 0 20px rgba(16,185,129,0.15)",
                  ],
                }
              : { scale: 1 }
          }
          transition={running ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
          className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-3xl border-2 border-border/80 bg-card p-8 shadow-float select-none transition-all"
        >
          <svg className="absolute inset-0 size-full p-6" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--secondary)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.64} 264`}
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="z-10 text-center">
            {finished ? (
              <>
                <Sparkles className="mx-auto size-12 text-primary animate-bounce" />
                <p className="mt-2 text-2xl font-extrabold text-foreground">Sesi Selesai! ✨</p>
                <p className="mt-1 text-sm text-primary font-bold">+{selectedMinutes} menit fokus tercatat</p>
              </>
            ) : (
              <>
                <p className="text-6xl font-extrabold tracking-tight text-foreground font-mono">
                  {formatTime(secondsLeft)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground font-semibold">dari {selectedMinutes} menit</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Ambient Nature Sound Controller */}
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-soft w-full max-w-sm">
          <p className="text-xs font-bold text-muted-foreground">Suara Latar Alam Relaksasi:</p>
          <div className="grid grid-cols-4 gap-2 w-full">
            <button
              onClick={() => toggleAmbient("none")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
                ambientType === "none"
                  ? "bg-secondary text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <VolumeX className="size-4" />
              <span>Hening</span>
            </button>
            <button
              onClick={() => toggleAmbient("rain")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
                ambientType === "rain"
                  ? "bg-sky-500 text-white shadow-soft"
                  : "text-muted-foreground hover:bg-sky-500/10 hover:text-sky-500"
              }`}
            >
              <CloudRain className="size-4" />
              <span>Hujan</span>
            </button>
            <button
              onClick={() => toggleAmbient("forest")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
                ambientType === "forest"
                  ? "bg-emerald-600 text-white shadow-soft"
                  : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
              }`}
            >
              <Trees className="size-4" />
              <span>Pinus</span>
            </button>
            <button
              onClick={() => toggleAmbient("fire")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-bold transition-all cursor-pointer ${
                ambientType === "fire"
                  ? "bg-amber-600 text-white shadow-soft"
                  : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
              }`}
            >
              <Flame className="size-4" />
              <span>Api</span>
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {PRESETS.map((m) => (
            <motion.button
              key={m}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => changeDuration(m)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                selectedMinutes === m && !finished
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "border border-border/70 bg-card text-foreground hover:bg-muted"
              }`}
            >
              {m} menit
            </motion.button>
          ))}
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2">
            <Clock className="size-4 text-muted-foreground" />
            <input
              type="number"
              min={1}
              max={180}
              value={selectedMinutes}
              onChange={(e) => changeDuration(Number(e.target.value) || 1)}
              className="w-16 bg-transparent text-sm font-semibold text-foreground outline-none"
            />
            <span className="text-xs text-muted-foreground">menit</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={handleStartPause}
            className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 cursor-pointer select-none"
          >
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
            {running ? "Jeda" : timerSnap.status === "paused" ? "Lanjutkan" : "Mulai"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            onClick={handleReset}
            className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-6 py-3 text-base font-bold text-foreground shadow-soft transition-colors hover:bg-muted cursor-pointer select-none"
          >
            <RotateCcw className="size-5" /> Reset
          </motion.button>
        </div>

        {/* History */}
        <div className="mt-10 w-full rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Riwayat Sesi
            </h3>
            {sessions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Hapus seluruh riwayat sesi fokus?")) {
                    setSessions([]);
                  }
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Hapus Semua
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={Clock}
                title="Belum ada sesi"
                description="Mulai timer untuk mencatat sesi pertamamu."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/80 dark:bg-secondary/50 dark:border-border/60 px-4 py-3 text-sm shadow-xs transition-all hover:border-primary/40 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{s.duration} menit</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.completedAt).toLocaleString("id-ID")}
                    </span>
                    <button
                      onClick={() => setSessions((prev) => prev.filter((item) => item.id !== s.id))}
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="Hapus sesi ini"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
