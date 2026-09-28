import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    Calendar,
    Clock,
    Volume2,
    VolumeX,
    Bell,
    TreePine,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
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
    const firstDayIndex = new Date(year, month, 1).getDay();
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
    if (!date) return 'Waktu Indonesia';
    const hours = date.getHours();
    if (hours >= 4 && hours < 11) return 'Selamat Pagi';
    if (hours >= 11 && hours < 15) return 'Selamat Siang';
    if (hours >= 15 && hours < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}

function formatTimezoneTime(date: Date | null, targetOffsetHours: number) {
    if (!date) return '--:--';
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    const targetDate = new Date(utcMs + targetOffsetHours * 3600000);
    const h = String(targetDate.getHours()).padStart(2, '0');
    const m = String(targetDate.getMinutes()).padStart(2, '0');
    const s = String(targetDate.getSeconds()).padStart(2, '0');
    return `${h}.${m}.${s}`;
}

function isSoundEnabled(): boolean {
    try {
        return localStorage.getItem('treenest_sfx') !== 'off';
    } catch {
        return true;
    }
}
function setSoundEnabledStorage(val: boolean) {
    try {
        localStorage.setItem('treenest_sfx', val ? 'on' : 'off');
        window.dispatchEvent(new CustomEvent('treenest_sfx_toggle', { detail: { enabled: val } }));
    } catch {}
}

export default function TopHeaderBanner() {
    const { url, props } = usePage() as any;
    const user = props.auth?.user;
    const username = user?.username || user?.name || 'Pengguna';
    const now = useNow();

    const [soundActive, setSoundActive] = useState(true);
    useEffect(() => {
        setSoundActive(isSoundEnabled());
        const handleSfxChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>;
            if (customEvent.detail) setSoundActive(customEvent.detail.enabled);
        };
        window.addEventListener('treenest_sfx_toggle', handleSfxChange);
        return () => window.removeEventListener('treenest_sfx_toggle', handleSfxChange);
    }, []);

    const toggleSound = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const next = !soundActive;
        setSoundActive(next);
        setSoundEnabledStorage(next);
    };

    const [showCalendar, setShowCalendar] = useState(false);
    const [showClock, setShowClock] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showCalendar && !showClock) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target?.closest('[data-treenest-calendar-trigger]') ||
                target?.closest('[data-treenest-clock-trigger]')
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
            if (e.key === 'Escape') {
                setShowCalendar(false);
                setShowClock(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showCalendar, showClock]);

    // Sembunyikan di halaman login/admin
    if (url === '/login' || url.startsWith('/admin')) {
        return null;
    }

    return (
        <>
            {/* ── BANNER TERPADU ATAS GLOBAL (EDGE-TO-EDGE) ── */}
            <motion.header
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-x-0 top-0 z-40 h-[64px] sm:h-[72px] border-b border-border/60 shadow-xs px-4 sm:px-6 md:px-8 flex items-center select-none overflow-hidden md:left-60"
            >
                {/* Layer Latar Belakang Banner */}
                <div className="absolute inset-0 bg-white/80 dark:bg-card/85 backdrop-blur-md" />

                <div className="relative flex w-full items-center justify-between z-10">
                    {/* Pojok Kiri: Sound, Notif, Daily Quest */}
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                        className="flex items-center justify-start gap-1 sm:gap-2 shrink-0"
                    >
                        {/* Tombol Suara */}
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.25, y: -1 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 17 }}
                            onClick={toggleSound}
                            title={soundActive ? 'Nonaktifkan Efek Suara (Mute)' : 'Aktifkan Efek Suara (Unmute)'}
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
                            whileHover={{ scale: 1.25, y: -1 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 17 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('treenest_toggle_notifications'));
                            }}
                            title="Pusat Notifikasi"
                            className="relative flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
                        >
                            <Bell className="size-5 shrink-0" />
                        </motion.button>

                        {/* Tombol Daily Quest */}
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.25, y: -1 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 17 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('treenest_toggle_dailyquest'));
                            }}
                            title="Daily Quest"
                            className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
                        >
                            <TreePine className="size-5 shrink-0" />
                        </motion.button>
                    </motion.div>

                    {/* Tengah: Sapaan */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4 sm:px-16">
                        <motion.h2
                            initial={{ opacity: 0, y: -14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto text-base sm:text-xl md:text-2xl font-black text-foreground tracking-tight drop-shadow-xs truncate max-w-[50vw] sm:max-w-[60vw] select-none cursor-default"
                        >
                            Haloo,{' '}
                            <span className="text-primary font-black drop-shadow-[0_2px_10px_rgba(34,197,94,0.3)]">
                                {username}
                            </span>
                        </motion.h2>
                    </div>

                    {/* Pojok Kanan: Kalender & Jam */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                        className="flex items-center justify-end gap-1 sm:gap-2 shrink-0"
                    >
                        {/* Tombol Kalender */}
                        <motion.button
                            type="button"
                            data-treenest-calendar-trigger="true"
                            whileHover={{ scale: 1.25, y: -1 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 17 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCalendar((prev) => {
                                    if (!prev) setShowClock(false);
                                    return !prev;
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
                            transition={{ type: 'spring', stiffness: 450, damping: 17 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowClock((prev) => {
                                    if (!prev) setShowCalendar(false);
                                    return !prev;
                                });
                            }}
                            title="Waktu & Jam"
                            className="flex items-center justify-center p-2 text-black dark:text-white cursor-pointer select-none"
                        >
                            <Clock className="size-5 shrink-0" />
                        </motion.button>
                    </motion.div>
                </div>
            </motion.header>

            {/* ── POP-UP KALENDER ── */}
            <AnimatePresence>
                {showCalendar && (
                    <div
                        ref={calendarRef}
                        className="fixed right-4 sm:right-6 md:right-8 top-[64px] sm:top-[72px] z-50 flex flex-col items-end select-none"
                    >
                        <motion.div
                            key="calendar-popup"
                            initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
                            animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
                            exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 290, mass: 0.65 }}
                            style={{ originY: 0 }}
                            className="w-80 sm:w-96 flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 shadow-2xl backdrop-blur-xl"
                        >
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
                            <div className="p-4 space-y-3.5">
                                <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Hari Ini</span>
                                    <h3 className="text-sm sm:text-base font-black text-foreground mt-0.5">
                                        {now ? `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}` : 'Memuat...'}
                                    </h3>
                                </div>
                                <div className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-3">
                                    <div className="text-center font-bold text-xs text-foreground mb-2">
                                        {now ? `${BULAN[now.getMonth()]} ${now.getFullYear()}` : ''}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground mb-1.5">
                                        <span className="text-red-500">Min</span>
                                        <span>Sen</span><span>Sel</span><span>Rab</span>
                                        <span>Kam</span><span>Jum</span><span>Sab</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                        {getCalendarDays(now).map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-7 flex items-center justify-center rounded-sm text-xs font-semibold ${
                                                    !item.day
                                                        ? 'opacity-0 pointer-events-none'
                                                        : item.isToday
                                                        ? 'bg-primary text-primary-foreground font-black shadow-xs ring-2 ring-primary/40'
                                                        : 'text-foreground hover:bg-black/5 dark:hover:bg-white/10'
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

            {/* ── POP-UP JAM ── */}
            <AnimatePresence>
                {showClock && (
                    <div
                        ref={clockRef}
                        className="fixed right-4 sm:right-6 md:right-8 top-[64px] sm:top-[72px] z-50 flex flex-col items-end select-none"
                    >
                        <motion.div
                            key="clock-popup"
                            initial={{ opacity: 0, y: -64, scaleY: 0.92, scaleX: 0.98 }}
                            animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
                            exit={{ opacity: 0, y: -50, scaleY: 0.94, scaleX: 0.98 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 290, mass: 0.65 }}
                            style={{ originY: 0 }}
                            className="w-80 sm:w-96 flex flex-col overflow-hidden rounded-md border border-black dark:border-white/30 bg-card/95 shadow-2xl backdrop-blur-xl"
                        >
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
                            <div className="p-4 space-y-3.5">
                                <div className="flex flex-col items-center justify-center rounded-md border border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 py-4 px-3 text-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Waktu Saat Ini</span>
                                    <div className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-foreground">
                                        {now
                                            ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
                                            : '--:--:--'}
                                    </div>
                                    <div className="mt-1.5 text-xs font-bold text-primary">{getTimeGreeting(now)}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[{ label: 'WIB', offset: 7 }, { label: 'WITA', offset: 8 }, { label: 'WIT', offset: 9 }].map((tz) => (
                                        <div key={tz.label} className="rounded-md border border-black/10 dark:border-white/10 bg-secondary/20 p-2 text-center">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{tz.label}</p>
                                            <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground">
                                                {formatTimezoneTime(now, tz.offset)}
                                            </p>
                                            <span className="text-[9px] text-muted-foreground font-medium">UTC+{tz.offset}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
