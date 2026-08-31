import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  CheckSquare,
  UserPlus,
  UserCheck,
  ShieldCheck,
  Sparkles,
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
  admin_video_pending: ShieldCheck,
};

export function NotificationCenterWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = (profile as any)?.role === "admin";
  const uid = profile?.uid ?? "guest";

  const [expanded, setExpanded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const update = () => {
      setNotifications(getStoredNotifications(uid, isAdmin));
    };
    update();
    const unsub = subscribeNotifications(update);
    return () => unsub();
  }, [uid, isAdmin]);

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
    <div className="fixed left-4 top-17 z-40 flex flex-col items-start select-none">
      {/* Compact Toggle Button */}
      <motion.button
        onClick={() => setExpanded((prev) => !prev)}
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`flex items-center gap-2 rounded-2xl border border-primary/50 bg-gradient-soft px-3.5 py-1.5 text-xs font-bold text-foreground shadow-soft backdrop-blur-md cursor-pointer ${
          expanded ? "ring-2 ring-primary/40 border-white" : ""
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-5 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0">
            <Bell className="size-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-destructive ring-1 ring-card animate-pulse" />
            )}
          </span>
          <span>Notifikasi</span>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary leading-none"
            >
              {unreadCount}
            </motion.span>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <ChevronDown className="size-3.5 text-primary" />
        </motion.div>
      </motion.button>

      {/* Expandable Downward Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -8, scaleY: 0.92, scaleX: 0.97 }}
            animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.92, scaleX: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ originY: 0 }}
            className="mt-2 w-80 max-h-[28rem] flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-float backdrop-blur-md"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-secondary/30 shrink-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">Pusat Notifikasi</span>
              </div>
              {notifications.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => clearAllNotifications()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-destructive transition-colors hover:underline"
                >
                  <Trash2 className="size-3" /> Hapus Semua
                </motion.button>
              )}
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
                          className={`group relative flex flex-col gap-1.5 rounded-2xl border p-2.5 text-xs transition-colors ${
                            item.read
                              ? "border-border/50 bg-background/60 dark:bg-secondary/30 opacity-75"
                              : "border-primary/40 bg-primary/10 shadow-xs"
                          }`}
                        >
                          {/* Title Row */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Icon className="size-3.5 text-primary shrink-0" />
                              <span className="font-bold text-foreground min-w-0 flex-1 break-words [word-break:break-word] overflow-hidden">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-1">
                              {formatTime(item.timestamp, group.dayLabel)}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-relaxed break-words [word-break:break-word] overflow-hidden">
                            {item.message}
                          </p>

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => handleOpenNotification(item)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground transition-all hover:bg-primary/90"
                            >
                              Buka <ExternalLink className="size-2.5" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => removeNotification(item.id)}
                              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
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
