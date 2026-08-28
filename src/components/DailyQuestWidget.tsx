import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  LogIn,
  FileText,
  Layers,
  Clock,
  Video,
  UserPlus,
  TreePine,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getDailyQuestState,
  subscribeExpUpdates,
  subscribeToasts,
  type DailyQuestState,
  type ToastNotice,
} from "@/lib/exp-service";
import { stageForLevel, expNeeded } from "@/lib/treenest";

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
      <div className="pointer-events-none fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-float backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
              toast.type === "levelup"
                ? "border-primary/50 bg-primary/95 text-primary-foreground"
                : "border-leaf/50 bg-leaf/95 text-white"
            }`}
          >
            <Sparkles className="size-6 shrink-0 animate-pulse" />
            <div>
              <p className="font-display text-sm font-bold">{toast.title}</p>
              <p className="text-xs opacity-90">{toast.subtitle}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-2 text-white/80 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ── DAILY QUEST WIDGET CONTAINER ── */}
      <div className="fixed top-17 right-4 z-40 flex flex-col items-end">
        {/* Toggle Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-2 rounded-2xl border border-primary/50 bg-gradient-soft px-3.5 py-1.5 text-xs font-bold text-foreground shadow-soft backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white cursor-pointer ${
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
          {expanded ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />}
        </button>

        {/* Expanded Quest Card */}
        {expanded && questState && (
          <div className="mt-2 w-72 rounded-3xl border border-primary/50 bg-gradient-soft p-4 shadow-float backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {/* Header: Stage & Level Progress */}
            <div className="border-b border-primary/30 pb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1">
                  <TreePine className="size-4 text-primary" />
                  {stage.label}
                </span>
                <span className="font-mono text-muted-foreground font-semibold">
                  {currentExp} / 50 EXP
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full rounded-full bg-gradient-leaf transition-all duration-500"
                  style={{ width: `${expProgressPct}%` }}
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
                />

                {/* 2. PiNote */}
                <QuestRow
                  icon={FileText}
                  title="PiNote (Catatan & File)"
                  subtitle="+5 EXP per aksi"
                  current={questState.pinoteCount}
                  max={3}
                />

                {/* 3. FlashCard */}
                <QuestRow
                  icon={Layers}
                  title="FlashCard (Buat Deck)"
                  subtitle="+5 EXP per card"
                  current={questState.flashcardCount}
                  max={3}
                />

                {/* 4. Study Session */}
                <QuestRow
                  icon={Clock}
                  title="Study Session (Selesai)"
                  subtitle="+5 EXP per sesi"
                  current={questState.studyCount}
                  max={3}
                />

                {/* 5. TreeGallery */}
                <QuestRow
                  icon={Video}
                  title="TreeGallery (Upload Video)"
                  subtitle="+10 EXP per video"
                  current={questState.galleryCount}
                  max={3}
                />

                {/* 6. Add Friend (Unlimited) */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4 text-sky-deep" />
                    <div>
                      <p className="font-semibold text-foreground">Add Friend</p>
                      <p className="text-[10px] text-muted-foreground">+15 EXP / teman</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">{questState.friendCount} teman</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Quest di-reset otomatis setiap hari 🕛
            </p>
          </div>
        )}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  current: number;
  max: number;
}) {
  const isDone = current >= max;

  return (
    <div
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
          <span className="flex items-center gap-0.5 font-bold text-leaf">
            {current} / {max} <Check className="size-3.5 stroke-[3]" />
          </span>
        ) : (
          <span className="text-muted-foreground">
            {current} / {max}
          </span>
        )}
      </div>
    </div>
  );
}
