import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Images,
  Sprout,
  Home,
  Users,
  User,
  TreePine,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudyTimerSnapshot, subscribeStudyTimer } from "@/lib/study-timer-service";
import { hasUncheckedReminders } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";
import { getIncomingFriendRequests, getUserFriends } from "@/lib/firestore-service";
import { useSidebar } from "@/hooks/use-sidebar";
import { playTapPop } from "@/lib/sound-fx";

const navItems = [
  {
    to: "/",
    label: "Home",
    icon: Home,
    iconClass: "group-hover:scale-115 group-hover:-translate-y-0.5",
  },
  {
    to: "/treegallery",
    label: "TreeGallery",
    icon: Images,
    iconClass: "group-hover:scale-115 group-hover:-rotate-6 group-hover:-translate-y-0.5",
  },
  {
    to: "/grow",
    label: "Grow",
    icon: Sprout,
    iconClass: "group-hover:scale-120 group-hover:-translate-y-1 group-hover:rotate-6",
  },
  {
    to: "/friend-club",
    label: "Friend Club",
    icon: Users,
    iconClass: "group-hover:scale-115 group-hover:-translate-y-0.5 group-hover:-rotate-3",
  },
  {
    to: "/account",
    label: "Account",
    icon: User,
    iconClass: "group-hover:scale-115 group-hover:-translate-y-1",
  },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";
  const { isCollapsed, toggleSidebar } = useSidebar();

  const [hasGrowBadge, setHasGrowBadge] = useState(false);
  const [hasGalleryBadge, setHasGalleryBadge] = useState(false);
  const [hasFriendBadge, setHasFriendBadge] = useState(false);
  const [isToggleHovered, setIsToggleHovered] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const checkBadges = async () => {
      const timerSnap = getStudyTimerSnapshot();
      const isTimerActive = timerSnap.status === "running" || timerSnap.status === "completed";
      const hasReminders = hasUncheckedReminders(uid);
      if (!isCancelled) {
        setHasGrowBadge(isTimerActive || hasReminders);
      }

      // Check TreeGallery unread moderation results
      try {
        const localRead = localStorage.getItem("treenest_read_comments");
        const readMap: Record<string, boolean> = localRead ? JSON.parse(localRead) : {};
        const userVidsRaw = localStorage.getItem(`treenest_gallery_videos_${uid}`);
        if (userVidsRaw) {
          const vids: Array<{ id: string; status: string }> = JSON.parse(userVidsRaw);
          const unread = vids.some(
            (v) => (v.status === "approved" || v.status === "rejected") && !readMap[v.id],
          );
          if (!isCancelled) {
            setHasGalleryBadge(unread);
          }
        }
      } catch {
        // ignore
      }

      // Check Friend Club unviewed requests & new friends
      if (uid && uid !== "guest") {
        try {
          const reqViewed = Number(
            localStorage.getItem(`treenest.friend.viewed_requests.${uid}`) || 0,
          );
          const contactsViewed = Number(
            localStorage.getItem(`treenest.friend.viewed_contacts.${uid}`) || 0,
          );
          const frViewed = Number(
            localStorage.getItem(`treenest.friend.viewed_friends.${uid}`) || 0,
          );

          const [incoming, friendsList] = await Promise.all([
            getIncomingFriendRequests(uid, profile?.accountId),
            getUserFriends(uid, profile?.accountId),
          ]);

          const friendKeys = new Set<string>(
            friendsList.flatMap((f) => [f.accountId, f.id, f.uid].filter(Boolean) as string[])
          );

          const { getIncomingContacts } = await import("@/lib/chat-service");
          const inContacts = await getIncomingContacts(uid, friendKeys);

          const hasReq = incoming.length > reqViewed;
          const hasFr = friendsList.length > frViewed;
          const hasContacts = inContacts.length > contactsViewed;

          if (!isCancelled) {
            setHasFriendBadge(hasReq || hasFr || hasContacts);
          }
        } catch {
          // ignore
        }
      } else {
        if (!isCancelled) {
          setHasFriendBadge(false);
        }
      }
    };

    checkBadges();
    const unsub = subscribeStudyTimer(checkBadges);
    const interval = setInterval(checkBadges, 3000);
    return () => {
      isCancelled = true;
      unsub();
      clearInterval(interval);
    };
  }, [uid, profile?.accountId, location.pathname]);

  if (
    location.pathname === "/login" ||
    location.pathname === "/admin" ||
    location.pathname === "/treegallery-all"
  ) {
    return null;
  }

  function getBadgeStatus(to: string) {
    if (to === "/grow") return hasGrowBadge;
    if (to === "/treegallery") return hasGalleryBadge;
    if (to === "/friend-club") return hasFriendBadge;
    return false;
  }

  return (
    <>
      {/* ── 1. SIDEBAR NAVIGASI SAMPING KIRI (DESKTOP & TABLET / md:flex) ── */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col justify-between border-r border-border/70 bg-white/90 dark:bg-card/95 backdrop-blur-xl shadow-xs select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? "w-[76px]" : "w-60"
        }`}
      >
        {/* Header / Brand Logo TreeNest */}
        <div className="flex flex-col shrink-0">
          <Link
            to="/"
            className="flex h-[64px] sm:h-[72px] items-center border-b border-border/60 hover:bg-neutral-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group px-4.5 gap-3.5 overflow-hidden"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -6, 6, 0] }}
              transition={{ duration: 0.4 }}
              className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-leaf text-white shadow-soft ring-2 ring-primary/20 shrink-0"
            >
              <TreePine className="size-5.5" strokeWidth={2.4} />
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-sun ring-2 ring-card animate-pulse" />
            </motion.div>
            <div
              className={`flex flex-col min-w-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap overflow-hidden ${
                isCollapsed
                  ? "max-w-0 opacity-0 -translate-x-4 pointer-events-none"
                  : "max-w-[140px] opacity-100 translate-x-0"
              }`}
            >
              <span className="font-display text-xl font-black tracking-tight bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight flex items-center gap-1.5">
                TreeNest
              </span>
            </div>
          </Link>
        </div>

        {/* Menu Navigasi Utama */}
        <div className={`flex-1 overflow-y-auto py-5 space-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? "px-2.5" : "px-3.5"}`}>
          <div
            className={`px-3.5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70 ${
              isCollapsed
                ? "max-h-0 opacity-0 pb-0 -translate-y-2 pointer-events-none"
                : "max-h-6 opacity-100 pb-2 translate-y-0"
            }`}
          >
            Menu Utama
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const showBadge = getBadgeStatus(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className="group relative flex items-center h-11 rounded-2xl text-sm font-bold text-muted-foreground hover:bg-neutral-100/90 dark:hover:bg-white/8 hover:text-foreground transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none active:scale-[0.98] px-3.5 gap-3.5 overflow-hidden"
                  activeProps={{
                    className:
                      "text-primary bg-primary/15 dark:bg-primary/25 dark:text-emerald-300 font-black shadow-xs ring-1 ring-primary/20",
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative flex items-center justify-center size-5 shrink-0">
                      <item.icon
                        className={`size-5 transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          item.iconClass ?? "group-hover:scale-120 group-hover:-translate-y-0.5"
                        }`}
                        strokeWidth={2.2}
                      />
                      <AnimatePresence>
                        {showBadge && isCollapsed && (
                          <motion.span
                            key="badge-dot-collapsed"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className={`truncate transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap ${
                        isCollapsed
                          ? "max-w-0 opacity-0 -translate-x-4 pointer-events-none"
                          : "max-w-[120px] opacity-100 translate-x-0"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <span
                    className={`size-2 rounded-full bg-destructive animate-pulse shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      !isCollapsed && showBadge ? "opacity-100 scale-100 ml-auto" : "opacity-0 scale-0 pointer-events-none"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tombol Kartu Saklar Expand / Collapse Sidebar (Di Atas Garis Pembatas Profil) */}
        <div
          className={`relative shrink-0 pb-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCollapsed ? "px-2.5 h-[50px]" : "px-3.5 h-[50px]"
          }`}
        >
          <motion.button
            type="button"
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setIsToggleHovered(false);
              playTapPop(1);
              toggleSidebar();
            }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`flex items-center h-10 rounded-2xl border border-border/80 hover:border-primary/60 text-muted-foreground hover:text-foreground bg-white dark:bg-card transition-all duration-300 ease-out cursor-pointer select-none shadow-xs group ${
              isCollapsed
                ? isToggleHovered
                  ? "absolute left-2.5 top-0 w-[212px] justify-between px-3.5 z-50 shadow-xl ring-2 ring-primary/30"
                  : "w-full justify-center px-2"
                : "w-full justify-between px-3.5 hover:bg-neutral-50/80 dark:hover:bg-white/5"
            }`}
          >
            {/* Sisi Kiri Kartu */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-bold text-muted-foreground group-hover:text-foreground transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap overflow-hidden ${
                  !isCollapsed
                    ? "max-w-[100px] opacity-100 translate-x-0"
                    : "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
                }`}
              >
                Collapse
              </span>
              {isCollapsed && (
                <PanelLeft
                  className="size-4.5 text-primary shrink-0 group-hover:scale-115 group-hover:rotate-6 transition-transform duration-300"
                  strokeWidth={2.2}
                />
              )}
            </div>

            {/* Sisi Kanan Kartu */}
            <div className="flex items-center gap-2 shrink-0">
              {!isCollapsed && (
                <PanelLeftClose
                  className="size-4.5 text-primary shrink-0 group-hover:scale-115 group-hover:-rotate-6 transition-transform duration-300"
                  strokeWidth={2.2}
                />
              )}
              {isCollapsed && isToggleHovered && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-xs font-bold text-primary select-none whitespace-nowrap drop-shadow-xs"
                >
                  Expand
                </motion.span>
              )}
            </div>
          </motion.button>
        </div>

        {/* Footer Sidebar: Garis Pembatas + Kartu Ringkasan Akun Profil Pengguna */}
        <div className="border-t border-border/60 bg-secondary/15 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] p-2.5">
          <Link
            to="/account"
            title={isCollapsed ? profile?.username || "Account" : undefined}
            className="group flex items-center gap-3 p-2 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white dark:hover:bg-card hover:shadow-soft border border-transparent hover:border-border/60 cursor-pointer w-full overflow-hidden"
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-leaf text-white font-black text-sm shadow-xs shrink-0 overflow-hidden ring-1 ring-primary/20"
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="size-full object-cover"
                />
              ) : (
                <span>
                  {profile?.initials || profile?.username?.slice(0, 2).toUpperCase() || "TN"}
                </span>
              )}
            </motion.div>
            <div
              className={`flex flex-col min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed
                  ? "max-w-0 opacity-0 -translate-x-4 pointer-events-none"
                  : "max-w-[130px] opacity-100 translate-x-0"
              }`}
            >
              <span className="text-xs font-black text-foreground truncate group-hover:text-primary transition-colors">
                {profile?.username || "Pengguna"}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground truncate">
                {profile?.accountId || "TN-0000"}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      {/* ── 2. BILAH NAVIGASI BAWAH RESPONSIP KHUSUS MOBILE (SMARTPHONE / md:hidden) ── */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex md:hidden justify-center pb-3 px-3">
        <div className="pointer-events-auto relative flex w-full max-w-md items-end justify-between gap-1 rounded-3xl border border-border/60 bg-card/85 px-3 pb-2 pt-2 shadow-float backdrop-blur-md">
          {navItems.slice(1, 3).map((item) => (
            <MobileNavItem
              key={item.to}
              {...item}
              showBadge={getBadgeStatus(item.to)}
            />
          ))}

          <Link
            to="/"
            aria-label="Home"
            className="group -mt-8 flex shrink-0 flex-col items-center gap-1 cursor-pointer select-none"
            activeProps={{ "data-active": "true" }}
          >
            <span className="flex size-15 items-center justify-center rounded-full bg-gradient-leaf text-primary-foreground shadow-float ring-4 ring-card transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-108 group-active:scale-90">
              <Home
                className="size-6.5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-0.5 group-hover:scale-110"
                strokeWidth={2.2}
              />
            </span>
            <span className="text-[10px] font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
              Home
            </span>
          </Link>

          {navItems.slice(3, 5).map((item) => (
            <MobileNavItem
              key={item.to}
              {...item}
              showBadge={getBadgeStatus(item.to)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
  iconClass,
  showBadge = false,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass?: string;
  showBadge?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-muted-foreground transition-all duration-200 hover:bg-primary/12 hover:text-primary dark:hover:bg-white/10 dark:hover:text-white cursor-pointer select-none active:scale-95"
      activeProps={{
        className:
          "text-primary bg-primary/15 font-bold shadow-xs dark:bg-primary/25 dark:text-emerald-300",
      }}
    >
      <div className="relative flex items-center justify-center">
        <Icon
          className={`size-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            iconClass ?? "group-hover:scale-115 group-hover:-translate-y-0.5"
          }`}
          strokeWidth={2.2}
        />
        <AnimatePresence>
          {showBadge && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -right-1 -top-1 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse"
            />
          )}
        </AnimatePresence>
      </div>
      <span className="text-[10px] font-semibold leading-none transition-colors duration-200 truncate max-w-[54px] text-center">
        {label}
      </span>
    </Link>
  );
}
