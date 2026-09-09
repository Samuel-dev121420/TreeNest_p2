import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  CheckSquare,
  UserPlus,
  UserCheck,
  ShieldCheck,
  MessageSquare,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStoredNotifications,
  subscribeNotifications,
  removeNotification,
  clearAllNotifications,
  markNotificationAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/notification-service";
import { useAuth } from "@/lib/auth-context";

const ICON_MAP: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  video_approved: CheckCircle2,
  video_rejected: XCircle,
  study_completed: Clock,
  reminder_due: CheckSquare,
  friend_request_received: UserPlus,
  friend_accepted: UserCheck,
  chat_received: MessageSquare,
  admin_video_pending: ShieldCheck,
};

export function NotificationCenterWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = (profile as any)?.role === "admin";
  const uid = profile?.uid ?? "guest";
  const accountId = profile?.accountId;

  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setNotifications(getStoredNotifications(uid, accountId, isAdmin));
    };
    update();
    const unsub = subscribeNotifications(update, uid, accountId, isAdmin);
    return () => unsub();
  }, [uid, accountId, isAdmin]);

  useEffect(() => {
    const handleToggle = () => setExpanded((prev) => !prev);
    const handleOpen = () => setExpanded(true);
    const handleClose = () => setExpanded(false);

    // Close when Daily Quest or Calendar or Clock is opened
    const handleCloseOthers = () => setExpanded(false);

    window.addEventListener("treenest_toggle_notifications", handleToggle);
    window.addEventListener("treenest_open_notifications", handleOpen);
    window.addEventListener("treenest_close_notifications", handleClose);
    window.addEventListener("treenest_toggle_dailyquest", handleCloseOthers);
    window.addEventListener("treenest_open_dailyquest", handleCloseOthers);
    window.addEventListener("treenest_open_calendar", handleCloseOthers);
    window.addEventListener("treenest_open_clock", handleCloseOthers);

    return () => {
      window.removeEventListener("treenest_toggle_notifications", handleToggle);
      window.removeEventListener("treenest_open_notifications", handleOpen);
      window.removeEventListener("treenest_close_notifications", handleClose);
      window.removeEventListener("treenest_toggle_dailyquest", handleCloseOthers);
      window.removeEventListener("treenest_open_dailyquest", handleCloseOthers);
      window.removeEventListener("treenest_open_calendar", handleCloseOthers);
      window.removeEventListener("treenest_open_clock", handleCloseOthers);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-treenest-notif-trigger]")) {
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

  // Sembunyikan di halaman Moderasi Admin dan Login
  if (location.pathname === "/admin" || location.pathname === "/login") {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by day
  const groupedByDay = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    notifications.forEach((item) => {
      const d = new Date(item.timestamp);
      const itemStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let groupKey = "";

      if (itemStr === todayStr) {
        groupKey = "Hari Ini";
      } else if (itemStr === yesterdayStr) {
        groupKey = "Kemarin";
      } else {
        groupKey = d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });

    const result: Array<{ dayLabel: string; items: AppNotification[] }> = [];
    map.forEach((items, dayLabel) => {
      result.push({ dayLabel, items });
    });
    return result;
  }, [notifications]);

  function formatTime(timestamp: number, dayLabel: string) {
    const d = new Date(timestamp);
    const timeStr = `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
    if (dayLabel === "Hari Ini") {
      return timeStr;
    }
    if (dayLabel === "Kemarin") {
      return `Kemarin, ${timeStr}`;
    }
    return timeStr;
  }

  function handleOpenNotification(item: AppNotification) {
    markNotificationAsRead(item.id);
    setExpanded(false);
    navigate({ to: item.link });
  }

  return (
    <div
      ref={containerRef}
      className="fixed left-4 sm:left-6 md:left-8 top-[64px] sm:top-[72px] z-30 flex flex-col items-start select-none"
    >
      {/* Balok / Elemen Pop-up Kotak (Tanpa Lengkungan) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
            animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
            exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 290, mass: 0.65 }}
            style={{ originY: 0 }}
            className="w-80 sm:w-96 max-h-[28rem] flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-3 bg-secondary/40 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Pusat Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => clearAllNotifications(uid, accountId, isAdmin)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-destructive transition-colors hover:underline cursor-pointer"
                  >
                    <Trash2 className="size-3" /> Hapus Semua
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setExpanded(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="size-4" />
                </motion.button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Tidak ada notifikasi dalam 7 hari terakhir.
                </motion.div>
              ) : (
                groupedByDay.map((group, groupIndex) => (
                  <div key={group.dayLabel} className="space-y-1.5">
                    {/* Day Header Divider */}
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: groupIndex * 0.04 }}
                      className="flex items-center gap-2 pt-1"
                    >
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {group.dayLabel}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </motion.div>

                    {/* Group Items */}
                    {group.items.map((item, itemIndex) => {
                      const Icon = ICON_MAP[item.type] || Bell;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{
                            delay: groupIndex * 0.04 + itemIndex * 0.05,
                            type: "spring",
                            stiffness: 360,
                            damping: 26,
                          }}
                          layout
                          className={`group relative flex flex-col gap-1.5 rounded-md border p-2.5 text-xs transition-colors ${
                            item.read
                              ? "border-border/50 bg-background/60 dark:bg-secondary/30 opacity-75"
                              : "border-primary/40 bg-primary/10 shadow-xs"
                          }`}
                        >
                          {/* Title Row */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <span className="font-bold text-foreground min-w-0 flex-1 break-words [word-break:break-word] text-xs leading-snug">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground shrink-0 ml-1.5 pt-0.5">
                              <Icon className="size-3 text-primary shrink-0" />
                              <span>{formatTime(item.timestamp, group.dayLabel)}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-relaxed break-words [word-break:break-word] overflow-hidden">
                            {item.message}
                          </p>

                          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t-[1.5px] border-black/15 dark:border-white/20">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleOpenNotification(item)}
                              className="flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
                            >
                              Buka
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => removeNotification(item.id)}
                              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer"
                              title="Hapus notifikasi ini"
                            >
                              <Trash2 className="size-3" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
