import { useEffect, useState, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  Calendar,
  Clock,
  Volume2,
  VolumeX,
  Bell,
  TreePine,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isSoundEnabled, setSoundEnabled, playTapPop } from "@/lib/sound-fx";
import { getStoredNotifications, subscribeNotifications } from "@/lib/notification-service";
import { searchUserByAccountId, type UserProfile as FirestoreUserProfile } from "@/lib/firestore-service";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getCalendarDays(date: Date | null) {
  if (!date) return [];
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ day: number | null; isToday: boolean }> = [];

  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ day: null, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isToday: d === date.getDate() });
  }
  return days;
}

function getTimeGreeting(date: Date | null) {
  if (!date) return "Waktu Indonesia";
  const hours = date.getHours();
  if (hours >= 4 && hours < 11) return "Selamat Pagi";
  if (hours >= 11 && hours < 15) return "Selamat Siang";
  if (hours >= 15 && hours < 18) return "Selamat Sore";
  return "Selamat Malam 🌙";
}

function formatTimezoneTime(date: Date | null, targetOffsetHours: number) {
  if (!date) return "--:--";
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const targetDate = new Date(utcMs + targetOffsetHours * 3600000);
  const h = String(targetDate.getHours()).padStart(2, "0");
  const m = String(targetDate.getMinutes()).padStart(2, "0");
  const s = String(targetDate.getSeconds()).padStart(2, "0");
  return `${h}.${m}.${s}`;
}

export function TopHeaderBanner() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const now = useNow();

  const username = profile?.username || user?.displayName || "Pengguna";
  const authUid = profile?.uid ?? user?.uid ?? "guest";
  const authAccountId = profile?.accountId;
  const isAdmin = (profile as any)?.role === "admin";

  // Sembunyikan banner secara mutlak di halaman Admin dan Login
  if (location.pathname === "/admin" || location.pathname === "/login") {
    return null;
  }

  // Sembunyikan di halaman chat personal yang memiliki header sendiri
  if (location.pathname.startsWith("/chat")) {
    return null;
  }

  // Visiting mode detection pada Home Page
  const searchObj = location.search as { visit?: string };
  const visitAccountId = location.pathname === "/" ? searchObj?.visit : undefined;
  const isVisiting = Boolean(visitAccountId);

  const [visitedProfile, setVisitedProfile] = useState<FirestoreUserProfile | null>(null);

  useEffect(() => {
    if (!isVisiting || !visitAccountId) {
      setVisitedProfile(null);
      return;
    }
    (async () => {
      try {
        const found = await searchUserByAccountId(visitAccountId);
        if (found) {
          setVisitedProfile(found);
        }
      } catch (e) {
        console.error("Error loading visited profile:", e);
      }
    })();
  }, [isVisiting, visitAccountId]);

  // Status Sound FX
  const [soundActive, setSoundActive] = useState(true);
  useEffect(() => {
    setSoundActive(isSoundEnabled());
    const handleSfxChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail) {
        setSoundActive(customEvent.detail.enabled);
      }
    };
    window.addEventListener("treenest_sfx_toggle", handleSfxChange);
    return () => window.removeEventListener("treenest_sfx_toggle", handleSfxChange);
  }, []);

  const toggleSound = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) playTapPop(0);
  };

  // Status notifikasi belum dibaca (lingkaran merah kecil di icon notif)
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  useEffect(() => {
    const checkUnread = () => {
      const notifs = getStoredNotifications(authUid, authAccountId, isAdmin);
      setHasUnreadNotif(notifs.some((n) => !n.read));
    };
    checkUnread();
    const unsub = subscribeNotifications(checkUnread, authUid, authAccountId, isAdmin);
    return () => unsub();
  }, [authUid, authAccountId, isAdmin]);

  // State pop-up Kalender & Jam di area kanan banner
  const [showCalendar, setShowCalendar] = useState(false);
  const [showClock, setShowClock] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  // Close calendar & clock on outside click or escape
  useEffect(() => {
    if (!showCalendar && !showClock) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("[data-treenest-calendar-trigger]") ||
        target?.closest("[data-treenest-clock-trigger]")
      ) {
        return;
      }
      if (showCalendar && calendarRef.current && !calendarRef.current.contains(target as Node)) {
        setShowCalendar(false);
      }
      if (showClock && clockRef.current && !clockRef.current.contains(target as Node)) {
        setShowClock(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCalendar(false);
        setShowClock(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCalendar, showClock]);

  // Listen to open notifications / daily quest to close calendar & clock
  useEffect(() => {
    const handleOtherOpen = () => {
      setShowCalendar(false);
      setShowClock(false);
    };
    window.addEventListener("treenest_toggle_notifications", handleOtherOpen);
    window.addEventListener("treenest_open_notifications", handleOtherOpen);
    window.addEventListener("treenest_toggle_dailyquest", handleOtherOpen);
    window.addEventListener("treenest_open_dailyquest", handleOtherOpen);
    return () => {
      window.removeEventListener("treenest_toggle_notifications", handleOtherOpen);
      window.removeEventListener("treenest_open_notifications", handleOtherOpen);
      window.removeEventListener("treenest_toggle_dailyquest", handleOtherOpen);
      window.removeEventListener("treenest_open_dailyquest", handleOtherOpen);
    };
  }, []);

  // Auto-close kalender & jam ketika user berpindah halaman
  useEffect(() => {
    setShowCalendar(false);
    setShowClock(false);
  }, [location.pathname]);

  return (
    <>
      {/* ── BANNER TERPADU ATAS GLOBAL (EDGE-TO-EDGE) DENGAN ANIMASI TRANSISI HALAMAN YANG SMOOTH & ELEGAN ── */}
      <motion.header
        key={location.pathname}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.85,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed inset-x-0 top-0 z-40 w-full min-h-[64px] sm:min-h-[72px] border-b border-border/60 shadow-sm px-4 sm:px-6 md:px-8 py-3 sm:py-3.5 flex items-center select-none overflow-hidden"
      >
        {/* Layer Latar Belakang Banner: Putih di Mode Terang, Hitam Navbar (bg-card) di Mode Gelap */}
        <div className="absolute inset-0 bg-white/70 dark:bg-card/70 backdrop-blur-md" />

        <div className="relative flex w-full items-center justify-between z-10">
          {/* Pojok Kiri: Tombol Fitur / Sistem Suara, Pusat Notifikasi & Daily Quest */}
          <div className="flex items-center justify-start gap-1 sm:gap-2 shrink-0">
            {/* Tombol Suara */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.25, y: -1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 17 }}
              onClick={toggleSound}
              title={soundActive ? "Nonaktifkan Efek Suara (Mute)" : "Aktifkan Efek Suara (Unmute)"}
              className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
            >
              {soundActive ? (
                <Volume2 className="size-5 shrink-0" />
              ) : (
                <VolumeX className="size-5 shrink-0 opacity-60" />
              )}
            </motion.button>

            {/* Tombol Pusat Notifikasi */}
            <motion.button
              type="button"
              data-treenest-notif-trigger="true"
              whileHover={{ scale: 1.25, y: -1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 17 }}
              onClick={(e) => {
                e.stopPropagation();
                playTapPop();
                window.dispatchEvent(new CustomEvent("treenest_toggle_notifications"));
              }}
              title="Pusat Notifikasi"
              className="relative flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
            >
              <Bell className="size-5 shrink-0" />
              {hasUnreadNotif && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-card animate-pulse" />
              )}
            </motion.button>

            {/* Tombol Daily Quest */}
            <motion.button
              type="button"
              data-treenest-quest-trigger="true"
              whileHover={{ scale: 1.25, y: -1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 17 }}
              onClick={(e) => {
                e.stopPropagation();
                playTapPop();
                window.dispatchEvent(new CustomEvent("treenest_toggle_dailyquest"));
              }}
              title="Daily Quest"
              className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
            >
              <TreePine className="size-5 shrink-0" />
            </motion.button>
          </div>

          {/* Bagian Tengah: Informasi Sapaan & Username Akun (100% Dead-Center Presisi) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 sm:px-16">
            {isVisiting && visitedProfile ? (
              <motion.h2
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="pointer-events-auto text-sm sm:text-base md:text-lg font-black text-foreground tracking-tight drop-shadow-xs truncate max-w-[65vw] sm:max-w-[70vw] select-none cursor-default text-center"
              >
                Anda sedang mengunjungi Home Page milik <span className="text-primary font-black drop-shadow-xs">{visitedProfile.username}</span>
              </motion.h2>
            ) : (
              <motion.h2
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="pointer-events-auto text-base sm:text-xl md:text-2xl font-black text-foreground tracking-tight drop-shadow-xs truncate max-w-[50vw] sm:max-w-[60vw] select-none cursor-default"
              >
                Haloo, <span className="text-primary font-black drop-shadow-xs">{username}</span>
              </motion.h2>
            )}
          </div>

          {/* Pojok Kanan: Tombol Kalender & Tombol Jam */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
            {/* Tombol Kalender */}
            <motion.button
              type="button"
              data-treenest-calendar-trigger="true"
              whileHover={{ scale: 1.25, y: -1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 17 }}
              onClick={(e) => {
                e.stopPropagation();
                playTapPop();
                setShowCalendar((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowClock(false);
                    window.dispatchEvent(new CustomEvent("treenest_open_calendar"));
                    window.dispatchEvent(new CustomEvent("treenest_close_notifications"));
                    window.dispatchEvent(new CustomEvent("treenest_close_dailyquest"));
                  }
                  return next;
                });
              }}
              title="Kalender & Tanggal"
              className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
            >
              <Calendar className="size-5 shrink-0" />
            </motion.button>

            {/* Tombol Jam */}
            <motion.button
              type="button"
              data-treenest-clock-trigger="true"
              whileHover={{ scale: 1.25, y: -1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 450, damping: 17 }}
              onClick={(e) => {
                e.stopPropagation();
                playTapPop();
                setShowClock((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowCalendar(false);
                    window.dispatchEvent(new CustomEvent("treenest_open_clock"));
                    window.dispatchEvent(new CustomEvent("treenest_close_notifications"));
                    window.dispatchEvent(new CustomEvent("treenest_close_dailyquest"));
                  }
                  return next;
                });
              }}
              title="Waktu & Jam"
              className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
            >
              <Clock className="size-5 shrink-0" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── POP-UP KALENDER DI SISI KANAN ATAS BANNER ── */}
      <AnimatePresence>
        {showCalendar && (
          <div
            ref={calendarRef}
            className="fixed right-4 sm:right-6 md:right-8 top-[64px] sm:top-[72px] z-30 flex flex-col items-end select-none"
          >
            <motion.div
              key="calendar-popup"
              initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
              animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
              exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 290, mass: 0.65 }}
              style={{ originY: 0 }}
              className="w-80 sm:w-96 flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-3 bg-secondary/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Kalender & Tanggal</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCalendar(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="size-4" />
                </motion.button>
              </div>

              {/* Isi Pop-up Kalender */}
              <div className="p-4 space-y-3.5">
                {/* Kartu Hari Ini */}
                <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Hari Ini
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-foreground mt-0.5">
                    {now ? `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}` : "Memuat..."}
                  </h3>
                </div>

                {/* Grid Kalender Mini Bulan Berjalan */}
                <div className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-3">
                  <div className="text-center font-bold text-xs text-foreground mb-2">
                    {now ? `${BULAN[now.getMonth()]} ${now.getFullYear()}` : ""}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground mb-1.5">
                    <span className="text-red-500">Min</span>
                    <span>Sen</span>
                    <span>Sel</span>
                    <span>Rab</span>
                    <span>Kam</span>
                    <span>Jum</span>
                    <span>Sab</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {getCalendarDays(now).map((item, idx) => (
                      <div
                        key={idx}
                        className={`h-7 flex items-center justify-center rounded-sm text-xs font-semibold ${
                          !item.day
                            ? "opacity-0 pointer-events-none"
                            : item.isToday
                            ? "bg-primary text-primary-foreground font-black shadow-xs ring-2 ring-primary/40"
                            : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        {item.day}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── POP-UP JAM DI SISI KANAN ATAS BANNER ── */}
      <AnimatePresence>
        {showClock && (
          <div
            ref={clockRef}
            className="fixed right-4 sm:right-6 md:right-8 top-[64px] sm:top-[72px] z-30 flex flex-col items-end select-none"
          >
            <motion.div
              key="clock-popup"
              initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
              animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
              exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 290, mass: 0.65 }}
              style={{ originY: 0 }}
              className="w-80 sm:w-96 flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-4 py-3 bg-secondary/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Waktu & Jam Digital</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowClock(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="size-4" />
                </motion.button>
              </div>

              {/* Isi Pop-up Jam */}
              <div className="p-4 space-y-3.5">
                {/* Jam Digital Utama */}
                <div className="flex flex-col items-center justify-center rounded-md border border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 py-4 px-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    Waktu Saat Ini
                  </span>
                  <div className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-foreground">
                    {now
                      ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
                      : "--:--:--"}
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-primary">
                    {getTimeGreeting(now)}
                  </div>
                </div>

                {/* Zona Waktu Indonesia: WIB, WITA, WIT */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-2 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">WIB</p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground">
                      {formatTimezoneTime(now, 7)}
                    </p>
                    <span className="text-[9px] text-muted-foreground font-medium">UTC+7</span>
                  </div>
                  <div className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-2 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">WITA</p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground">
                      {formatTimezoneTime(now, 8)}
                    </p>
                    <span className="text-[9px] text-muted-foreground font-medium">UTC+8</span>
                  </div>
                  <div className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-2 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">WIT</p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground">
                      {formatTimezoneTime(now, 9)}
                    </p>
                    <span className="text-[9px] text-muted-foreground font-medium">UTC+9</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
