import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Clock, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import {
  getStudyTimerSnapshot,
  subscribeStudyTimer,
  type StudyTimerState,
} from "@/lib/study-timer-service";

export function GlobalStudyTimerBar() {
  const location = useLocation();
  const [timerSnap, setTimerSnap] = useState(getStudyTimerSnapshot());

  useEffect(() => {
    const update = () => setTimerSnap(getStudyTimerSnapshot());
    update();
    const unsub = subscribeStudyTimer(update);
    const interval = setInterval(update, 1000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Hide on /admin and /grow/study
  if (location.pathname === "/admin" || location.pathname === "/grow/study") {
    return null;
  }

  // Only show if running, paused, or completed
  if (timerSnap.status === "idle") {
    return null;
  }

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const isCompleted = timerSnap.status === "completed";

  return (
    <div className="fixed top-3 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
      <Link
        to="/grow/study"
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-bold shadow-float backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 border animate-in slide-in-from-top-4 ${
          isCompleted
            ? "border-leaf/50 bg-leaf/90 text-white shadow-leaf/30 animate-bounce"
            : "border-sun/60 bg-card/90 text-foreground dark:bg-card/95 shadow-soft"
        }`}
      >
        {isCompleted ? (
          <>
            <CheckCircle2 className="size-4 text-white shrink-0 animate-spin" />
            <span>Timer Berakhir! Klik di sini untuk kembali ke Sesi Belajar</span>
            <ChevronRight className="size-4 shrink-0" />
          </>
        ) : (
          <>
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-sun" />
            </span>
            <Clock className="size-3.5 text-sun shrink-0" />
            <span>
              Sesi Belajar:{" "}
              <span className="font-mono text-primary font-extrabold">
                {formatTime(timerSnap.secondsLeft)}
              </span>{" "}
              {timerSnap.status === "paused" ? "(Dijeda)" : "tersisa"}
            </span>
            <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
          </>
        )}
      </Link>
    </div>
  );
}
