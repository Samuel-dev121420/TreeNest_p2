import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Play, Pause, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ToolHeader } from "@/components/ToolHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { generateId, type StudySession } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import { awardActivityExp } from "@/lib/exp-service";

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
  const { profile, refreshProfile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const [sessions, setSessions] = useLocalStorage<StudySession[]>(`treenest.study.sessions.${uid}`, []);
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const totalSeconds = duration * 60;
  const progress = useMemo(
    () => ((totalSeconds - secondsLeft) / totalSeconds) * 100,
    [secondsLeft, totalSeconds],
  );

  useEffect(() => {
    if (!running) return;

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (!finished) return;

    setSessions((prev) => [
      { id: generateId(), duration, completedAt: Date.now() },
      ...prev.slice(0, 49),
    ]);

    if (uid !== "guest") awardActivityExp(uid, "study");
  }, [finished]);

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function reset() {
    setRunning(false);
    setFinished(false);
    setSecondsLeft(duration * 60);
  }

  function changeDuration(minutes: number) {
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    setRunning(false);
    setFinished(false);
  }

  return (
    <PageShell title="" description="">
      <ToolHeader
        title="Study Session"
        description="Atur durasi fokus, lalu mulai sesi belajarmu."
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
                <Sparkles className="mx-auto size-10 text-primary" />
                <p className="mt-2 text-xl font-bold text-foreground">Sesi selesai!</p>
                <p className="text-sm text-muted-foreground">+{duration} menit fokus</p>
              </>
            ) : (
              <>
                <p className="text-6xl font-bold tracking-tight text-foreground">
                  {formatTime(secondsLeft)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">dari {duration} menit</p>
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
                duration === m && !finished
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
              value={duration}
              onChange={(e) =>
                changeDuration(Math.max(1, Math.min(180, Number(e.target.value) || 1)))
              }
              className="w-16 bg-transparent text-sm font-semibold text-foreground outline-none"
            />
            <span className="text-xs text-muted-foreground">menit</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            disabled={finished}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
            {running ? "Jeda" : "Mulai"}
          </button>
          <button
            onClick={reset}
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
                  className="flex items-center justify-between rounded-xl bg-background px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{s.duration} menit fokus</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.completedAt).toLocaleString("id-ID")}
                    </span>
                    <button
                      onClick={() => setSessions((prev) => prev.filter((item) => item.id !== s.id))}
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
