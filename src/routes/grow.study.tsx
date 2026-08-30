import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Play, Pause, RotateCcw, Sparkles, Trash2 } from "lucide-react";
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

  useEffect(() => {
    const update = () => {
      const snap = getStudyTimerSnapshot();
      setTimerSnap(snap);
      if (snap.status === "completed") {
        markStudySessionSaved(uid);
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
    if (running) {
      pauseStudyTimer();
    } else if (timerSnap.status === "paused") {
      resumeStudyTimer();
    } else {
      startStudyTimer(selectedMinutes);
    }
  }

  function handleReset() {
    resetStudyTimer(selectedMinutes);
  }

  function changeDuration(minutes: number) {
    const valid = Math.max(1, Math.min(180, minutes));
    setSelectedMinutes(valid);
    resetStudyTimer(valid);
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="Study Session"
        description="Atur durasi fokus, lalu mulai sesi belajarmu. Timer tetap berjalan walau kamu keluar dari halaman ini."
      />

      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {/* Timer ring */}
        <div className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-3xl border border-border/70 bg-card p-8 shadow-soft">
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
                <Sparkles className="mx-auto size-10 text-primary animate-bounce" />
                <p className="mt-2 text-xl font-bold text-foreground">Sesi selesai!</p>
                <p className="text-sm text-muted-foreground">+{selectedMinutes} menit fokus</p>
              </>
            ) : (
              <>
                <p className="text-6xl font-bold tracking-tight text-foreground">
                  {formatTime(secondsLeft)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">dari {selectedMinutes} menit</p>
              </>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => changeDuration(m)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                selectedMinutes === m && !finished
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/70 bg-card text-foreground hover:bg-muted"
              }`}
            >
              {m} menit
            </button>
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
          <button
            onClick={handleStartPause}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 shadow-soft"
          >
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
            {running ? "Jeda" : timerSnap.status === "paused" ? "Lanjutkan" : "Mulai"}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-5" /> Reset
          </button>
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
