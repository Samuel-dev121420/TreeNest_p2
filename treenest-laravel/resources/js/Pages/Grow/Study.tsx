import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    Clock,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    Sparkles,
    Flame,
    BookOpen,
    Headphones,
    Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Session {
    id: number;
    duration_minutes: number;
    category: string;
    notes: string | null;
    exp_gained: number;
    completed_at: string;
}

export default function Study({
    sessions = [],
    totalMinutes = 0,
}: {
    sessions: Session[];
    totalMinutes: number;
}) {
    const [selectedMinutes, setSelectedMinutes] = useState(25);
    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [category, setCategory] = useState('Fokus Belajar');

    useEffect(() => {
        let interval: any = null;
        if (isRunning && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft((prev) => prev - 1);
            }, 1000);
        } else if (secondsLeft === 0 && isRunning) {
            setIsRunning(false);
            handleCompleteSession();
        }
        return () => clearInterval(interval);
    }, [isRunning, secondsLeft]);

    const handleSelectDuration = (mins: number) => {
        if (isRunning) return;
        setSelectedMinutes(mins);
        setSecondsLeft(mins * 60);
    };

    const handleToggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        setIsRunning(false);
        setSecondsLeft(selectedMinutes * 60);
    };

    const handleCompleteSession = () => {
        confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.7 },
        });

        router.post(
            route('study.store'),
            {
                duration_minutes: selectedMinutes,
                category: category,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSecondsLeft(selectedMinutes * 60);
                },
            }
        );
    };

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const progress = ((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16">
            <Head title="Sesi Belajar & Fokus — TreeNest" />
            <TopHeaderBanner />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-xl bg-sky-600 text-white shadow-sm">
                        <Clock className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Sesi Belajar & Fokus
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Gunakan timer Pomodoro untuk menyelesaikan tugas dan percepat pertumbuhan pohonmu.
                        </p>
                    </div>
                </div>

                {/* Grid Konten: Timer + Riwayat */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Kartu Timer (7 kolom) */}
                    <div className="md:col-span-7 rounded-3xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100/80 dark:border-neutral-800 p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center">
                        {/* Pilihan Durasi */}
                        <div className="flex items-center gap-2 mb-6 select-none">
                            {[15, 25, 45, 60].map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    disabled={isRunning}
                                    onClick={() => handleSelectDuration(m)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                                        selectedMinutes === m
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                                    }`}
                                >
                                    {m} Menit
                                </button>
                            ))}
                        </div>

                        {/* Lingkaran Timer */}
                        <div className="relative size-60 sm:size-64 flex items-center justify-center my-2 select-none">
                            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="44"
                                    className="stroke-neutral-100 dark:stroke-neutral-800 fill-none"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="44"
                                    className="stroke-sky-500 fill-none transition-all duration-500"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray="276.46"
                                    strokeDashoffset={276.46 - (276.46 * progress) / 100}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-neutral-900 dark:text-white">
                                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                </span>
                                <span className="text-xs font-semibold text-neutral-400 mt-1">
                                    {isRunning ? 'Sedang Berfokus...' : 'Siap Memulai'}
                                </span>
                            </div>
                        </div>

                        {/* Tombol Kontrol */}
                        <div className="flex items-center gap-3 mt-6 select-none">
                            <button
                                type="button"
                                onClick={handleReset}
                                title="Reset Timer"
                                className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-300 transition cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="size-5" />
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleTimer}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer active:scale-95 ${
                                    isRunning
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                                }`}
                            >
                                {isRunning ? (
                                    <>
                                        <Pause className="size-5 fill-current" />
                                        <span>Jeda</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="size-5 fill-current" />
                                        <span>Mulai Sesi</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleCompleteSession}
                                title="Selesaikan Sekarang"
                                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition cursor-pointer active:scale-95"
                            >
                                <CheckCircle2 className="size-5" />
                            </button>
                        </div>
                    </div>

                    {/* Sisi Kanan: Statistik & Riwayat (5 kolom) */}
                    <div className="md:col-span-5 space-y-4">
                        {/* Total Menit */}
                        <div className="p-5 rounded-3xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Total Waktu Fokus</span>
                                <p className="text-2xl font-black text-neutral-900 dark:text-white mt-0.5">
                                    {totalMinutes} <span className="text-sm font-semibold text-neutral-400">Menit</span>
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                                <Flame className="size-6" />
                            </div>
                        </div>

                        {/* Riwayat Sesi */}
                        <div className="p-5 rounded-3xl bg-white/90 dark:bg-neutral-900/90 border border-emerald-100/80 dark:border-neutral-800 shadow-sm">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
                                Riwayat Sesi Terbaru
                            </h3>
                            {sessions.length === 0 ? (
                                <p className="text-xs text-neutral-400 text-center py-6">
                                    Belum ada sesi yang diselesaikan hari ini.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {sessions.map((s) => (
                                        <div
                                            key={s.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs"
                                        >
                                            <div>
                                                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                    {s.category || 'Fokus'}
                                                </p>
                                                <span className="text-[10px] text-neutral-400">
                                                    {s.duration_minutes} Menit
                                                </span>
                                            </div>
                                            <span className="font-bold text-amber-500 flex items-center gap-0.5">
                                                <Sparkles className="size-3" />
                                                +{s.exp_gained} EXP
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
