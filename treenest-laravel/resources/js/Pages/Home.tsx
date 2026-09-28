import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreePine } from 'lucide-react';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

// ─── Konstanta Level → Stage ─────────────────────────────────────────────────
const TREEHOUSE_LEVEL = 20;

type TreeStage = {
    key: string;
    label: string;
    image: string;
    height: number; // persen (%)
};

const TREE_STAGES: TreeStage[] = [
    { key: 'seedling',     label: 'Seedling (Benih)',            image: '/assets/tree-1.png',         height: 22 },
    { key: 'young_tree',   label: 'Young Tree (Pohon Muda)',     image: '/assets/tree-2.png',         height: 38 },
    { key: 'growing_tree', label: 'Growing Tree (Pohon Tumbuh)', image: '/assets/tree-3.png',         height: 60 },
    { key: 'mature_tree',  label: 'Mature Tree (Pohon Dewasa)',  image: '/assets/tree-4.png',         height: 78 },
    { key: 'house_tree',   label: 'House Tree (Rumah Pohon)',    image: '/assets/tree-5.png',         height: 92 },
];

function stageForLevel(level: number): TreeStage {
    if (level <= 5)  return TREE_STAGES[0]!;
    if (level <= 10) return TREE_STAGES[1]!;
    if (level <= 15) return TREE_STAGES[2]!;
    if (level <= 19) return TREE_STAGES[3]!;
    return TREE_STAGES[4]!;
}

interface UserData {
    id: number;
    name: string;
    username: string | null;
    level: number;
    exp: number;
    streak: number;
    role: string;
    avatar_url: string | null;
    hue?: number;
    initials?: string;
}

interface FriendOrb {
    id: string;
    name: string;
    initials: string;
    hue: number;
    avatarUrl?: string;
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home({ user, friends = [] }: { user: UserData; friends?: FriendOrb[] }) {
    const level = Math.min(20, user?.level ?? 1);
    const username = user?.username || user?.name || 'Pengguna';
    const hue = user?.hue ?? 150;
    const initials = user?.initials || username.slice(0, 2).toUpperCase();

    const stage = useMemo(() => stageForLevel(level), [level]);
    const isTreehouseReady = level >= TREEHOUSE_LEVEL || stage.key === 'house_tree';

    const [showTreehouse, setShowTreehouse] = useState(false);
    const [showTreeTip, setShowTreeTip] = useState(false);
    const [showTreeBadge, setShowTreeBadge] = useState(true);

    // Pause semua animasi ketika modal terbuka
    const paused = showTreehouse || showTreeTip;

    useEffect(() => {
        if (!isTreehouseReady) return;
        setShowTreeBadge(true);
        const timer = setTimeout(() => setShowTreeBadge(false), 4000);
        return () => clearTimeout(timer);
    }, [isTreehouseReady]);

    const handleTreeTap = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isTreehouseReady) {
            setShowTreehouse(true);
        } else {
            setShowTreeTip(true);
        }
    };

    return (
        <main className="relative h-screen w-full overflow-hidden bg-gradient-sky">
            <Head title="TreeNest — Tumbuhkan Pohonmu Setiap Hari" />
            <h1 className="sr-only">TreeNest — Home</h1>

            {/* Scene latar: langit gradien, gunung, pohon cemara, awan, burung */}
            <SceneBackground paused={paused} />

            {/* Awan — 7 Awan melayang di berbagai ketinggian & kecepatan */}
            <Cloud className="top-[4%] w-32 opacity-90"  duration={65}  delay={0}   paused={paused} />
            <Cloud className="top-[10%] w-24 opacity-75" duration={88}  delay={-24} paused={paused} />
            <Cloud className="top-[16%] w-28 opacity-85" duration={78}  delay={-52} paused={paused} />
            <Cloud className="top-[22%] w-20 opacity-65" duration={105} delay={-15} paused={paused} />
            <Cloud className="top-[28%] w-36 opacity-80" duration={95}  delay={-42} paused={paused} />
            <Cloud className="top-[34%] w-22 opacity-60" duration={115} delay={-70} paused={paused} />
            <Cloud className="top-[8%] w-18 opacity-50"  duration={130} delay={-85} paused={paused} />

            {/* Burung */}
            <Bird className="top-[17%]"           duration={40} delay={-7}  paused={paused} />
            <Bird className="top-[28%] scale-75"  duration={56} delay={-27} paused={paused} />

            {/* Tanah lurus — Permukaan rumput */}
            <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-ground">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-[color-mix(in_oklab,var(--grass)_75%,white)]" />
                <GrassLine />
            </div>

            {/* Pohon utama — Berdiri di atas rumput */}
            <div className="absolute inset-x-0 bottom-[17%] flex h-[48%] items-end justify-center z-10">
                <div
                    onClick={handleTreeTap}
                    title={isTreehouseReady ? 'Ketuk untuk masuk ke Rumah Pohon!' : 'Pohon masih bertumbuh'}
                    className="group relative flex h-full items-end justify-center cursor-pointer select-none"
                >
                    {/* Tombol Floating Masuk Rumah Pohon */}
                    {isTreehouseReady && (
                        <div
                            className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
                                showTreeBadge
                                    ? 'opacity-100 scale-100 pointer-events-auto'
                                    : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                            }`}
                        >
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTreehouse(true);
                                }}
                                className="animate-bounce inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-primary/50 bg-gradient-soft px-4 py-2 text-xs font-bold text-foreground shadow-soft backdrop-blur-md transition-colors hover:border-white cursor-pointer select-none dark:border-primary/50 dark:bg-card dark:text-foreground dark:hover:border-primary"
                            >
                                <span className="whitespace-nowrap font-bold text-foreground">Masuk Rumah Pohon</span>
                            </motion.button>
                        </div>
                    )}

                    {/* Bayangan Pohon */}
                    <span className="absolute -bottom-1 left-1/2 h-3 w-28 -translate-x-1/2 rounded-[100%] bg-[color-mix(in_oklab,var(--soil)_35%,transparent)] blur-[3px]" />

                    {/* Pohon */}
                    <motion.img
                        key={stage.key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        src={stage.image}
                        alt={`Pohonmu saat ini: ${stage.label}`}
                        className="relative origin-bottom object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.15)] group-hover:brightness-105 transition-all"
                        style={{ height: `${stage.height}%` }}
                    />
                </div>
            </div>

            {/* Semak & rumput — Tersebar di kiri dan kanan */}
            {/* Sisi Kiri */}
            <Bush className="bottom-[19.2%] left-[1.5%] w-22 z-10 opacity-95"   delay="0.2s"  paused={paused} />
            <Bush className="bottom-[19.8%] left-[9.5%] w-14 z-10 opacity-85"   delay="1.1s"  paused={paused} flip />
            <Bush className="bottom-[19.2%] left-[18%] w-20 z-10 opacity-95"    delay="0.6s"  paused={paused} />
            <Bush className="bottom-[19.8%] left-[26.5%] w-14 z-10 opacity-85"  delay="1.5s"  paused={paused} flip />
            <Bush className="bottom-[19.0%] left-[35%] w-15 z-10 opacity-90"    delay="0.8s"  paused={paused} />
            {/* Sisi Kanan */}
            <Bush className="bottom-[19.0%] right-[35%] w-15 z-10 opacity-90"   delay="1.3s"  paused={paused} flip />
            <Bush className="bottom-[19.8%] right-[26.5%] w-14 z-10 opacity-85" delay="1.7s"  paused={paused} />
            <Bush className="bottom-[19.2%] right-[18%] w-20 z-10 opacity-95"   delay="0.5s"  paused={paused} flip />
            <Bush className="bottom-[19.8%] right-[9.5%] w-14 z-10 opacity-85"  delay="1.2s"  paused={paused} />
            <Bush className="bottom-[19.2%] right-[1.5%] w-22 z-10 opacity-95"  delay="0.3s"  paused={paused} flip />

            {/* Bola profil: pengguna (Berjalan di atas rumput) */}
            <div className="absolute inset-x-0 bottom-[14%] h-16 z-10">
                {/* Orb diri sendiri */}
                <Orb
                    label="Kamu"
                    initials={initials}
                    hue={hue}
                    avatarUrl={user?.avatar_url || undefined}
                    duration={26}
                    delay={0}
                    from={6}
                    to={34}
                    paused={paused}
                />

                {/* Orb teman */}
                {friends.map((f, i) => (
                    <Orb
                        key={f.id}
                        label={f.name}
                        initials={f.initials}
                        hue={f.hue}
                        avatarUrl={f.avatarUrl}
                        duration={30 + i * 7}
                        delay={-(i + 1) * 9}
                        from={38 + i * 17}
                        to={48 + i * 17}
                        paused={paused}
                    />
                ))}
            </div>

            {/* Tooltip Popup Pertumbuhan Pohon (jika belum Level 20) */}
            <AnimatePresence>
                {showTreeTip && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                        onClick={() => setShowTreeTip(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: 12 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }}
                            className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 dark:border-emerald-500/30 dark:bg-emerald-950/95 dark:shadow-emerald-950/60"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex size-14 items-center justify-center rounded-3xl bg-leaf/15 text-leaf mx-auto shadow-inner dark:bg-emerald-500/20 dark:text-emerald-300">
                                <TreePine className="size-7" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground dark:text-emerald-100">
                                    Pohonmu Sedang Bertumbuh
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed dark:text-emerald-300/80">
                                    Pohonmu saat ini berada di <strong>Level {level} ({stage.label})</strong>.
                                </p>
                                <div className="mt-3 rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground text-left space-y-1.5 dark:bg-emerald-900/50 dark:text-emerald-200/80">
                                    <p className="font-bold text-foreground dark:text-emerald-100">Kunci Membuka Rumah Pohon:</p>
                                    <p>• Capai <strong>Level {TREEHOUSE_LEVEL} (House Tree)</strong>.</p>
                                    <p>• Selesaikan Daily Quest dan aktivitas produktif untuk mengumpulkan EXP.</p>
                                    <p>• Setelah terbuka, kamu bisa masuk dan memamerkan videomu di sini!</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTreeTip(false)}
                                className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white cursor-pointer"
                            >
                                Semangat Menanam!
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Rumah Pohon (sederhana untuk sekarang) */}
            <AnimatePresence>
                {showTreehouse && isTreehouseReady && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                        onClick={() => setShowTreehouse(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: 12 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }}
                            className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-4xl">🏡</div>
                            <h3 className="text-xl font-black text-foreground">Rumah Pohon TreeNest</h3>
                            <p className="text-sm text-muted-foreground">
                                Selamat datang di tempat peristirahatan pribadimu di atas dahan yang kokoh!
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowTreehouse(false)}
                                className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                            >
                                Tutup Rumah Pohon
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header & Bottom Nav */}
            <TopHeaderBanner />
            <BottomNav />
        </main>
    );
}

// ─── Orb (Bola Profil) ───────────────────────────────────────────────────────
function Orb({
    label, initials, hue, avatarUrl, duration, delay, from, to, onClick, paused,
}: {
    label: string; initials: string; hue: number; avatarUrl?: string;
    duration: number; delay: number; from: number; to: number;
    onClick?: () => void; paused?: boolean;
}) {
    const isClickable = !!onClick;
    return (
        <div
            className="animate-stroll absolute bottom-0"
            style={{
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                '--stroll-from': `${from}%`,
                '--stroll-to': `${to}%`,
                animationPlayState: paused ? 'paused' : 'running',
            } as React.CSSProperties}
        >
            <div
                className={`animate-float-y flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'pointer-events-none'}`}
                style={{ animationPlayState: paused ? 'paused' : 'running' }}
                onClick={onClick}
                title={isClickable ? `Lihat profil ${label}` : undefined}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={label}
                        className={`size-11 rounded-full object-cover shadow-float ring-2 ring-card/70 transition-transform ${isClickable ? 'hover:scale-110 hover:ring-primary/60' : ''}`}
                    />
                ) : (
                    <span
                        className={`flex size-11 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-float ring-2 ring-card/70 transition-transform ${isClickable ? 'hover:scale-110 hover:ring-primary/60' : ''}`}
                        style={{
                            backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${hue}), oklch(0.66 0.13 ${hue + 25}))`,
                        }}
                    >
                        {initials}
                    </span>
                )}
                <span className="mt-1 rounded-full bg-card/70 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 backdrop-blur-sm shadow-xs">
                    {label}
                </span>
            </div>
        </div>
    );
}

// ─── SceneBackground ─────────────────────────────────────────────────────────
function SceneBackground({ paused }: { paused?: boolean }) {
    const horizonTrees = [
        // Sisi Kiri
        { pos: '-left-[4%]',   height: 'h-48', delay: '0s',   anim: 'animate-breeze' },
        { pos: 'left-[3.5%]',  height: 'h-36', delay: '1.4s', anim: 'animate-sway' },
        { pos: 'left-[8%]',    height: 'h-44', delay: '0.7s', anim: 'animate-breeze' },
        { pos: 'left-[15%]',   height: 'h-36', delay: '1.8s', anim: 'animate-sway' },
        { pos: 'left-[20%]',   height: 'h-44', delay: '0.4s', anim: 'animate-breeze' },
        { pos: 'left-[27%]',   height: 'h-36', delay: '1.2s', anim: 'animate-sway' },
        { pos: 'left-[32%]',   height: 'h-44', delay: '0.5s', anim: 'animate-breeze' },
        { pos: 'left-[38%]',   height: 'h-46', delay: '1.6s', anim: 'animate-sway' },
        // Tengah
        { pos: 'left-[45%]',   height: 'h-44', delay: '0.9s', anim: 'animate-breeze' },
        // Sisi Kanan
        { pos: 'right-[38%]',  height: 'h-46', delay: '1.6s', anim: 'animate-sway' },
        { pos: 'right-[32%]',  height: 'h-44', delay: '0.5s', anim: 'animate-breeze' },
        { pos: 'right-[27%]',  height: 'h-36', delay: '1.2s', anim: 'animate-sway' },
        { pos: 'right-[20%]',  height: 'h-44', delay: '0.4s', anim: 'animate-breeze' },
        { pos: 'right-[15%]',  height: 'h-36', delay: '1.8s', anim: 'animate-sway' },
        { pos: 'right-[8%]',   height: 'h-44', delay: '0.7s', anim: 'animate-breeze' },
        { pos: 'right-[3.5%]', height: 'h-36', delay: '1.4s', anim: 'animate-sway' },
        { pos: '-right-[4%]',  height: 'h-48', delay: '0s',   anim: 'animate-breeze' },
    ];

    return (
        <>
            {/* ── Langit gradien cerah statis ── */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'linear-gradient(180deg, oklch(0.76 0.08 226) 0%, oklch(0.86 0.055 220) 35%, oklch(0.90 0.045 190) 65%, oklch(0.88 0.07 155) 100%)',
                }}
            />

            {/* ── Matahari Ambient ── */}
            <div
                aria-hidden="true"
                className="animate-sun-glow pointer-events-none absolute right-[10%] top-[6%] size-64 rounded-full bg-amber-200/30 blur-3xl"
                style={{ animationPlayState: paused ? 'paused' : 'running' }}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute right-[16%] top-[10%] size-16 rounded-full bg-amber-100/90 shadow-[0_0_50px_rgba(253,224,71,0.5)]"
            />

            {/* ── 5 Gunung Simetris Rapi ── */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[20%] h-64 select-none overflow-hidden z-0">
                <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="size-full">
                    <defs>
                        <linearGradient id="mntGradC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.74 0.06 230)" />
                            <stop offset="100%" stopColor="oklch(0.84 0.05 180)" />
                        </linearGradient>
                        <linearGradient id="mntGradBD" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.76 0.07 210)" />
                            <stop offset="100%" stopColor="oklch(0.82 0.08 165)" />
                        </linearGradient>
                        <linearGradient id="mntGradAE" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.78 0.06 195)" />
                            <stop offset="100%" stopColor="oklch(0.80 0.10 155)" />
                        </linearGradient>
                    </defs>
                    {/* Gunung C — Tengah */}
                    <path d="M 440 240 L 720 20 L 1000 240 Z" fill="url(#mntGradC)" opacity="0.95" />
                    {/* Gunung B — Kiri Tengah */}
                    <path d="M 120 240 L 360 55 L 600 240 Z" fill="url(#mntGradBD)" opacity="0.9" />
                    {/* Gunung D — Kanan Tengah */}
                    <path d="M 840 240 L 1080 55 L 1320 240 Z" fill="url(#mntGradBD)" opacity="0.9" />
                    {/* Gunung A — Paling Kiri */}
                    <path d="M -120 240 L 120 100 L 360 240 Z" fill="url(#mntGradAE)" opacity="0.95" />
                    {/* Gunung E — Paling Kanan */}
                    <path d="M 1080 240 L 1320 100 L 1560 240 Z" fill="url(#mntGradAE)" opacity="0.95" />
                </svg>
            </div>

            {/* ── Pohon Latar Belakang Cemara (Hutan Alami Abstrak) ── */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[20%] h-56 select-none z-[1] overflow-hidden">
                {horizonTrees.map((t, idx) => (
                    <div
                        key={idx}
                        className={`${t.anim} absolute ${t.pos} bottom-0 flex items-end opacity-90`}
                        style={{ animationDelay: t.delay, animationPlayState: paused ? 'paused' : 'running' }}
                    >
                        <img
                            src="/assets/Pohon Cemara.png"
                            alt=""
                            className={`${t.height} w-auto object-contain drop-shadow-sm`}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}

// ─── Cloud ───────────────────────────────────────────────────────────────────
function Cloud({ className, duration, delay, paused }: { className: string; duration: number; delay: number; paused?: boolean }) {
    return (
        <div
            className={`animate-drift pointer-events-none absolute ${className}`}
            style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s`, animationPlayState: paused ? 'paused' : 'running' }}
        >
            <svg viewBox="0 0 100 48" className="size-full drop-shadow-xs" aria-hidden="true">
                <g fill="var(--cloud)">
                    <ellipse cx="32" cy="30" rx="26" ry="16" />
                    <ellipse cx="58" cy="24" rx="22" ry="18" />
                    <ellipse cx="76" cy="32" rx="18" ry="12" />
                </g>
            </svg>
        </div>
    );
}

// ─── Bird ────────────────────────────────────────────────────────────────────
function Bird({ className, duration, delay, paused }: { className: string; duration: number; delay: number; paused?: boolean }) {
    return (
        <div
            className={`animate-fly-by pointer-events-none absolute left-0 ${className}`}
            style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s`, animationPlayState: paused ? 'paused' : 'running' }}
        >
            <div className="animate-bird-body" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
                <svg
                    viewBox="0 0 52 36"
                    className="h-8 w-11 overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
                    aria-hidden="true"
                >
                    {/* Sayap Belakang */}
                    <path
                        className="animate-bird-wing-far"
                        style={{ animationPlayState: paused ? 'paused' : 'running' }}
                        d="M 22 13 C 19 4, 11 -2, 6 0 C 10 5, 15 9, 22 13 Z"
                        fill="oklch(0.90 0.015 220)"
                    />
                    {/* Tubuh */}
                    <path
                        d="M 47 15.5 L 41 13.5 C 38 10.5, 33 10.5, 29 12.5 C 22 12.5, 15 16, 2 22 C 7 22.5, 12 21.5, 15 20 C 18 24.5, 27 24, 34 19.5 C 38 17.5, 41 16.5, 47 15.5 Z"
                        fill="oklch(0.98 0.005 220)"
                    />
                    {/* Mata */}
                    <circle cx="36" cy="13.5" r="0.9" fill="oklch(0.20 0.02 240)" />
                    {/* Sayap Depan */}
                    <path
                        className="animate-bird-wing-near"
                        style={{ animationPlayState: paused ? 'paused' : 'running' }}
                        d="M 25 14 C 22 3, 13 -4, 7 -2 C 12 4, 18 9, 25 14 Z"
                        fill="oklch(0.99 0.005 220)"
                    />
                </svg>
            </div>
        </div>
    );
}

// ─── GrassLine ───────────────────────────────────────────────────────────────
function GrassLine() {
    return (
        <svg
            viewBox="0 0 1200 24"
            preserveAspectRatio="none"
            className="absolute inset-x-0 -top-3 h-4 w-full"
            aria-hidden="true"
        >
            <path
                d="M0 24 Q 30 4, 60 24 Q 90 2, 120 24 Q 150 6, 180 24 Q 210 3, 240 24 Q 270 5, 300 24 Q 330 2, 360 24 Q 390 4, 420 24 Q 450 1, 480 24 Q 510 5, 540 24 Q 570 3, 600 24 Q 630 6, 660 24 Q 690 2, 720 24 Q 750 4, 780 24 Q 810 1, 840 24 Q 870 5, 900 24 Q 930 3, 960 24 Q 990 6, 1020 24 Q 1050 2, 1080 24 Q 1110 4, 1140 24 Q 1170 1, 1200 24 L 1200 24 L 0 24 Z"
                fill="var(--grass)"
            />
        </svg>
    );
}

// ─── Bush ────────────────────────────────────────────────────────────────────
function Bush({ className, flip = false, delay, paused }: { className?: string; flip?: boolean; delay?: string; paused?: boolean }) {
    return (
        <div
            className={`animate-breeze pointer-events-none absolute select-none ${className ?? ''}`}
            style={{
                transform: flip ? 'scaleX(-1)' : undefined,
                animationDelay: delay,
                animationPlayState: paused ? 'paused' : 'running',
            }}
        >
            <img
                src="/assets/bush.png"
                alt=""
                className="h-auto w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.12)]"
            />
        </div>
    );
}
