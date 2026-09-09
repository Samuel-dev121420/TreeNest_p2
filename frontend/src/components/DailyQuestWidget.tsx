import { useEffect, useState, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Sparkles,
  LogIn,
  FileText,
  Layers,
  Clock,
  Video,
  UserPlus,
  TreePine,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  getDailyQuestState,
  subscribeExpUpdates,
  subscribeToasts,
  type DailyQuestState,
  type ToastNotice,
} from "@/lib/exp-service";
import { stageForLevel } from "@/lib/treenest";

export function DailyQuestWidget() {
  const location = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const uid = profile?.uid ?? user?.uid;

  const [questState, setQuestState] = useState<DailyQuestState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load quest state & subscribe to real-time events
  useEffect(() => {
    if (!uid) return;

    function fetchState() {
      getDailyQuestState(uid!).then(setQuestState);
      refreshProfile();
    }

    fetchState();
    const unsubscribeExp = subscribeExpUpdates(fetchState);

    return () => unsubscribeExp();
  }, [uid, refreshProfile]);

  // Subscribe to toasts
  useEffect(() => {
    const unsubscribeToast = subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    });
    return () => unsubscribeToast();
  }, []);

  useEffect(() => {
    const handleToggle = () => setExpanded((prev) => !prev);
    const handleOpen = () => setExpanded(true);
    const handleClose = () => setExpanded(false);

    // Close when other popups (Notifications, Calendar, Clock) are opened
    const handleCloseOthers = () => setExpanded(false);

    window.addEventListener("treenest_toggle_dailyquest", handleToggle);
    window.addEventListener("treenest_open_dailyquest", handleOpen);
    window.addEventListener("treenest_close_dailyquest", handleClose);
    window.addEventListener("treenest_toggle_notifications", handleCloseOthers);
    window.addEventListener("treenest_open_notifications", handleCloseOthers);
    window.addEventListener("treenest_open_calendar", handleCloseOthers);
    window.addEventListener("treenest_open_clock", handleCloseOthers);

    return () => {
      window.removeEventListener("treenest_toggle_dailyquest", handleToggle);
      window.removeEventListener("treenest_open_dailyquest", handleOpen);
      window.removeEventListener("treenest_close_dailyquest", handleClose);
      window.removeEventListener("treenest_toggle_notifications", handleCloseOthers);
      window.removeEventListener("treenest_open_notifications", handleCloseOthers);
      window.removeEventListener("treenest_open_calendar", handleCloseOthers);
      window.removeEventListener("treenest_open_clock", handleCloseOthers);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-treenest-quest-trigger]")) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        setExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  if (location.pathname === "/admin" || location.pathname === "/login") return null;
  if (!uid || !profile) return null;

  const currentLevel = profile.level || 1;
  const currentExp = profile.exp || 0;
  const stage = stageForLevel(currentLevel);
  const expProgressPct = Math.min(100, Math.round((currentExp / 50) * 100));

  return (
    <>
      {/* ── FLOATING TOAST NOTIFICATIONS ── */}
      <div className="pointer-events-none fixed top-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isLevelUp = toast.type === "levelup";
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className={`pointer-events-auto flex items-center gap-3.5 rounded-3xl border px-5 py-3.5 shadow-2xl backdrop-blur-xl min-w-[280px] max-w-sm ${
                  isLevelUp
                    ? "border-amber-400/60 bg-gradient-to-r from-amber-500/95 via-yellow-500/95 to-amber-600/95 text-white shadow-amber-500/25"
                    : "border-primary/50 bg-card/95 text-card-foreground shadow-float dark:border-primary/40 dark:bg-card/95"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg shadow-inner">
                  {isLevelUp ? "⭐" : "🌱"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight drop-shadow-xs">{toast.title}</p>
                  <p
                    className={`text-[11px] leading-snug mt-0.5 ${
                      isLevelUp ? "text-amber-100" : "text-muted-foreground"
                    }`}
                  >
                    {toast.subtitle}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className={`rounded-full p-1 transition-colors cursor-pointer ${
                    isLevelUp
                      ? "text-white/80 hover:bg-white/20 hover:text-white"
                      : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                  title="Tutup Notifikasi"
                >
                  <X className="size-4" />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── DAILY QUEST POP-UP KOTAK (Tanpa Lengkungan, Sejajar Vertikal dengan Icon Speaker) ── */}
      <div
        ref={containerRef}
        className="fixed left-4 sm:left-6 md:left-8 top-[64px] sm:top-[72px] z-30 flex flex-col items-start select-none"
      >
        <AnimatePresence>
          {expanded && questState && (
            <motion.div
              key="quest-panel"
              initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
              animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
              exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 290, mass: 0.65 }}
              style={{ originY: 0 }}
              className="w-[22rem] sm:w-[26rem] max-h-[34rem] flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl"
            >
              {/* Header: Stage & Level Progress */}
              <div className="border-b border-black/10 dark:border-white/10 pb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <TreePine className="size-4 text-primary" />
                    {stage.label}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setExpanded(false)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                    title="Tutup"
                  >
                    <X className="size-4" />
                  </motion.button>
                </div>

                {/* Animated EXP Progress Bar */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-sm bg-secondary/80 border border-border/60">
                  <motion.div
                    className="h-full rounded-sm bg-gradient-leaf"
                    initial={{ width: 0 }}
                    animate={{ width: `${expProgressPct}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
                  />
                </div>

                {/* Informasi Level & Progress EXP di bawah Progress Bar */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">
                    Level {currentLevel}
                  </span>
                  <motion.span
                    key={currentExp}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="font-mono text-muted-foreground font-semibold text-[11px]"
                  >
                    {currentExp} / 50 EXP
                  </motion.span>
                </div>
              </div>

              {/* Quests Section */}
              <div className="mt-3 flex-1 overflow-y-auto pr-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Daily Quests Harian
                  </p>
                  <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                    Reset Tiap Hari
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {/* 1. Daily Login */}
                  <QuestRow
                    icon={LogIn}
                    title="Login"
                    subtitle="+15 EXP"
                    current={questState.loginDone ? 1 : 0}
                    max={1}
                    index={0}
                  />

                  {/* 2. PiNote */}
                  <QuestRow
                    icon={FileText}
                    title="PiNote"
                    subtitle="+5 EXP per aksi"
                    current={questState.pinoteCount}
                    max={3}
                    index={1}
                  />

                  {/* 3. FlashCard */}
                  <QuestRow
                    icon={Layers}
                    title="FlashCard"
                    subtitle="+5 EXP per card"
                    current={questState.flashcardCount}
                    max={3}
                    index={2}
                  />

                  {/* 4. Study Session */}
                  <QuestRow
                    icon={Clock}
                    title="Study Session"
                    subtitle="+5 EXP per sesi"
                    current={questState.studyCount}
                    max={3}
                    index={3}
                  />

                  {/* 5. TreeGallery */}
                  <QuestRow
                    icon={Video}
                    title="TreeGallery"
                    subtitle="+10 EXP per video"
                    current={questState.galleryCount}
                    max={3}
                    index={4}
                  />

                  {/* 6. Add Friend (Unlimited) */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 5 * 0.05, type: "spring", stiffness: 340, damping: 26 }}
                    className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
                        <UserPlus className="size-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-xs leading-tight">Add Friend</p>
                        <p className="text-[10px] font-medium text-muted-foreground leading-tight mt-0.5">+15 EXP / teman</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      {questState.friendCount} teman
                    </span>
                  </motion.div>
                </div>
              </div>

              <p className="mt-2.5 text-center text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                Selesaikan aktivitas harian untuk mempercepat pertumbuhan pohon
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function QuestRow({
  icon: Icon,
  title,
  subtitle,
  current,
  max,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  current: number;
  max: number;
  index: number;
}) {
  const isDone = current >= max;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 340, damping: 26 }}
      className={`group flex items-center justify-between rounded-md border p-2.5 text-xs transition-all duration-200 ${
        isDone
          ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 dark:border-emerald-500/30"
          : "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md transition-colors ${
            isDone
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
          }`}
        >
          <Icon className="size-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate text-xs leading-tight">
            {title}
          </p>
          <p
            className={`text-[10px] font-medium leading-tight mt-0.5 ${
              isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 font-bold ml-2">
        {isDone ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="inline-flex items-center rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
          >
            {current} / {max}
          </motion.span>
        ) : (
          <motion.span
            key={current}
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="inline-flex items-center rounded-md bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-foreground/80 border border-black/5 dark:border-white/10"
          >
            {current} / {max}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
