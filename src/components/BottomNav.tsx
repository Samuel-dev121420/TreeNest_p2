import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Images, Sprout, Home, Users, User, ArrowLeft } from "lucide-react";
import { getStudyTimerSnapshot, subscribeStudyTimer } from "@/lib/study-timer-service";
import { hasUncheckedReminders } from "@/lib/grow-tools";
import { useAuth } from "@/lib/auth-context";

const items = [
  { to: "/treegallery", label: "TreeGallery", icon: Images },
  { to: "/grow", label: "Grow", icon: Sprout },
  { to: "/friend-club", label: "Friend Club", icon: Users },
  { to: "/account", label: "Account", icon: User },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";

  const [hasGrowBadge, setHasGrowBadge] = useState(false);
  const [hasGalleryBadge, setHasGalleryBadge] = useState(false);
  const [hasFriendBadge, setHasFriendBadge] = useState(false);

  const searchObj = location.search as { visit?: string };
  const isVisiting = location.pathname === "/" && Boolean(searchObj?.visit);

  useEffect(() => {
    const checkBadges = () => {
      const timerSnap = getStudyTimerSnapshot();
      const isTimerActive = timerSnap.status === "running" || timerSnap.status === "completed";
      const hasReminders = hasUncheckedReminders(uid);
      setHasGrowBadge(isTimerActive || hasReminders);

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
          setHasGalleryBadge(unread);
        }
      } catch {
        // ignore
      }

      // Check Friend Club unviewed requests/friends
      try {
        const reqViewed = Number(localStorage.getItem(`treenest.friend.viewed_requests.${uid}`) || 0);
        const frViewed = Number(localStorage.getItem(`treenest.friend.viewed_friends.${uid}`) || 0);
        const localReqs = localStorage.getItem(`treenest_friend_requests_${uid}`);
        const localFriends = localStorage.getItem(`treenest_friends_${uid}`);
        const reqs: any[] = localReqs ? JSON.parse(localReqs) : [];
        const friends: any[] = localFriends ? JSON.parse(localFriends) : [];
        const hasReq = reqs.filter((r) => r.status === "pending").length > reqViewed;
        const hasFr = friends.length > frViewed;
        setHasFriendBadge(hasReq || hasFr);
      } catch {
        // ignore
      }
    };

    checkBadges();
    const unsub = subscribeStudyTimer(checkBadges);
    const interval = setInterval(checkBadges, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [uid, location.pathname]);

  if (
    location.pathname === "/login" ||
    location.pathname === "/admin" ||
    location.pathname === "/treegallery-all"
  ) {
    return null;
  }

  // Jika sedang mengunjungi Home Page user lain: Tampilkan HANYA 1 tombol Kembali / Escape
  if (isVisiting) {
    return (
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-4 animate-in fade-in duration-200">
        <div className="pointer-events-auto relative flex items-center justify-center rounded-3xl border border-border/60 bg-card/85 px-6 pb-2 pt-2 shadow-float backdrop-blur-md">
          <Link
            to="/"
            aria-label="Kembali ke Home"
            className="group -mt-7 flex shrink-0 flex-col items-center gap-1 cursor-pointer"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-gradient-leaf text-primary-foreground shadow-float ring-4 ring-card transition-transform group-hover:scale-105 group-active:scale-95">
              <ArrowLeft className="size-7" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] font-bold text-foreground">Kembali</span>
          </Link>
        </div>
      </nav>
    );
  }

  function getBadgeStatus(to: string) {
    if (to === "/grow") return hasGrowBadge;
    if (to === "/treegallery") return hasGalleryBadge;
    if (to === "/friend-club") return hasFriendBadge;
    return false;
  }

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-4">
      <div className="pointer-events-auto relative flex w-full max-w-md items-end justify-between gap-1 rounded-3xl border border-border/60 bg-card/85 px-3 pb-2 pt-2 shadow-float backdrop-blur-md sm:max-w-lg">
        {items.slice(0, 2).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            showBadge={getBadgeStatus(item.to)}
          />
        ))}

        <Link
          to="/"
          aria-label="Home"
          className="group -mt-8 flex shrink-0 flex-col items-center gap-1"
          activeProps={{ "data-active": "true" }}
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-gradient-leaf text-primary-foreground shadow-float ring-4 ring-card transition-transform group-hover:scale-105 group-active:scale-95">
            <Home className="size-7" strokeWidth={2.2} />
          </span>
          <span className="text-[11px] font-semibold text-foreground">Home</span>
        </Link>

        {items.slice(2).map((item) => (
          <NavItem
            key={item.to}
            {...item}
            showBadge={getBadgeStatus(item.to)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  showBadge = false,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  showBadge?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-muted-foreground transition-all duration-200 hover:bg-primary/12 hover:text-primary hover:scale-105 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
      activeProps={{ className: "text-primary bg-primary/15 font-bold shadow-xs dark:bg-primary/25 dark:text-emerald-300" }}
    >
      <div className="relative">
        <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.2} />
        {showBadge && (
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
        )}
      </div>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  );
}
