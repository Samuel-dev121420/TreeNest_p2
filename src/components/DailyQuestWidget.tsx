import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Sparkles,
  ChevronDown,
  Check,
  LogIn,
  FileText,
  Layers,
  Clock,
  Video,
  UserPlus,
  TreePine,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
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
                    : "border-emerald-500/40 bg-white/95 text-neutral-900 shadow-xl dark:bg-zinc-900/95 dark:border-emerald-500/50 dark:text-zinc-100"
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border ${
                    isLevelUp
                      ? "bg-white/20 border-white/40 text-yellow-100"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
                  }`}
                >
                  <Sparkles className="size-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-display text-sm font-extrabold tracking-tight ${isLevelUp ? "text-white" : "text-neutral-900 dark:text-white"}`}>
                    {toast.title}
                  </p>
                  <p className={`text-xs font-semibold truncate ${isLevelUp ? "text-white/90" : "text-neutral-600 dark:text-zinc-400"}`}>
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

      {/* ── DAILY QUEST WIDGET CONTAINER ── */}
      <div className="fixed top-17 right-4 z-40 flex flex-col items-end">
        {/* Toggle Button */}
        <motion.button
          onClick={() => setExpanded(!expanded)}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`flex items-center gap-2 rounded-2xl border border-primary/50 bg-gradient-soft px-3.5 py-1.5 text-xs font-bold text-foreground shadow-soft backdrop-blur-md cursor-pointer ${
            expanded ? "ring-2 ring-primary/40 border-white" : ""
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <TreePine className="size-3.5" />
            </span>
            <span>Lv.{currentLevel}</span>
            <span className="text-muted-foreground font-normal">({currentExp}/50 EXP)</span>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronDown className="size-3.5 text-primary" />
          </motion.div>
        </motion.button>

        {/* Expanded Quest Card */}
        <AnimatePresence>
          {expanded && questState && (
            <motion.div
              key="quest-panel"
              initial={{ opacity: 0, y: -10, scaleY: 0.9, scaleX: 0.97 }}
              animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
              exit={{ opacity: 0, y: -10, scaleY: 0.9, scaleX: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              style={{ originY: 0 }}
              className="mt-2 w-72 rounded-3xl border border-primary/50 bg-gradient-soft p-4 shadow-float backdrop-blur-md"
            >
              {/* Header: Stage & Level Progress */}
              <div className="border-b border-primary/30 pb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <TreePine className="size-4 text-primary" />
                    {stage.label}
                  </span>
                  <motion.span
                    key={currentExp}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="font-mono text-muted-foreground font-semibold"
                  >
                    {currentExp} / 50 EXP
                  </motion.span>
                </div>

                {/* Animated EXP Progress Bar */}
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
                  <motion.div
                    className="h-full rounded-full bg-gradient-leaf"
                    initial={{ width: 0 }}
                    animate={{ width: `${expProgressPct}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.1 }}
                  />
                </div>
              </div>

              {/* Quests Section */}
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Daily Quests Harian
                </p>

                <div className="mt-2 space-y-1.5">
                  {/* 1. Daily Login */}
                  <QuestRow
                    icon={LogIn}
                    title="Daily Login"
                    subtitle="+15 EXP"
                    current={questState.loginDone ? 1 : 0}
                    max={1}
                    index={0}
                  />

                  {/* 2. PiNote */}
                  <QuestRow
                    icon={FileText}
                    title="PiNote (Catatan & File)"
                    subtitle="+5 EXP per aksi"
                    current={questState.pinoteCount}
                    max={3}
                    index={1}
                  />

                  {/* 3. FlashCard */}
                  <QuestRow
                    icon={Layers}
                    title="FlashCard (Buat Deck)"
                    subtitle="+5 EXP per card"
                    current={questState.flashcardCount}
                    max={3}
                    index={2}
                  />

                  {/* 4. Study Session */}
                  <QuestRow
                    icon={Clock}
                    title="Study Session (Selesai)"
                    subtitle="+5 EXP per sesi"
                    current={questState.studyCount}
                    max={3}
                    index={3}
                  />

                  {/* 5. TreeGallery */}
                  <QuestRow
                    icon={Video}
                    title="TreeGallery (Upload Video)"
                    subtitle="+10 EXP per video"
                    current={questState.galleryCount}
                    max={3}
                    index={4}
                  />

                  {/* 6. Add Friend (Unlimited) */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 5 * 0.06, type: "spring", stiffness: 340, damping: 26 }}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="size-4 text-sky-deep" />
                      <div>
                        <p className="font-semibold text-foreground">Add Friend</p>
                        <p className="text-[10px] text-muted-foreground">+15 EXP / teman</p>
                      </div>
                    </div>
                    <span className="font-bold text-primary">{questState.friendCount} teman</span>
                  </motion.div>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Quest di-reset otomatis setiap hari 🕛
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
      transition={{ delay: index * 0.06, type: "spring", stiffness: 340, damping: 26 }}
      className={`flex items-center justify-between rounded-xl border p-2 text-xs transition-colors ${
        isDone
          ? "border-leaf/40 bg-leaf/10 text-leaf"
          : "border-border/50 bg-background/60 text-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`size-4 shrink-0 ${isDone ? "text-leaf" : "text-muted-foreground"}`} />
        <div className="min-w-0">
          <p className="font-semibold truncate text-[11px]">{title}</p>
          <p className="text-[10px] opacity-75">{subtitle}</p>
        </div>
      </div>
      <div className="shrink-0 font-bold ml-2">
        {isDone ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="flex items-center gap-0.5 font-bold text-leaf"
          >
            {current} / {max} <Check className="size-3.5 stroke-[3]" />
          </motion.span>
        ) : (
          <motion.span
            key={current}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-muted-foreground"
          >
            {current} / {max}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
