import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import skyBg from "@/assets/sky-bg.jpg";
import { useAuth } from "@/lib/auth-context";
import { DEMO_USER, expNeeded, stageForLevel, TREEHOUSE_LEVEL } from "@/lib/treenest";
import { getUserFriends, getFeaturedFriends } from "@/lib/firestore-service";
import type { Friend } from "@/lib/social";
import { TreehouseModal } from "@/components/TreehouseModal";
import { Sparkles, Home, ChevronRight, X, TreePine } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TreeNest — Tumbuhkan Pohonmu Setiap Hari" },
      {
        name: "description",
        content:
          "TreeNest adalah ruang tenang untuk tumbuh: rawat pohonmu, kumpulkan EXP dari aktivitas produktif, dan undang teman berkunjung.",
      },
      { property: "og:title", content: "TreeNest — Tumbuhkan Pohonmu Setiap Hari" },
      {
        property: "og:description",
        content:
          "Pohon berkembang, Rumah Pohon, TreeGallery, dan tools produktivitas dalam satu tempat yang adem.",
      },
    ],
  }),
  component: HomePage,
});

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

function HomePage() {
  const now = useNow();
  const { profile: authProfile } = useAuth();
  const user = authProfile || DEMO_USER;
  const level = user.level;
  const exp = user.exp;
  const username = user.username;

  const [featuredFriendsList, setFeaturedFriendsList] = useState<Friend[]>([]);
  const [showTreehouse, setShowTreehouse] = useState(false);
  const [showTreeTip, setShowTreeTip] = useState(false);
  const [showTreeBadge, setShowTreeBadge] = useState(true);

  // Load actual featured friends for the logged in user
  useEffect(() => {
    if (!authProfile?.uid) {
      setFeaturedFriendsList([]);
      return;
    }
    Promise.all([
      getUserFriends(authProfile.uid),
      getFeaturedFriends(authProfile.uid),
    ]).then(([allFriends, featuredIds]) => {
      const featured = allFriends.filter(
        (f) => featuredIds.includes(f.id) || featuredIds.includes(f.accountId),
      );
      setFeaturedFriendsList(featured);
    });
  }, [authProfile?.uid]);

  const stage = useMemo(() => stageForLevel(level), [level]);
  const need = expNeeded(level);
  const pct = Math.min(100, Math.round((exp / need) * 100));
  const isTreehouseReady = level >= TREEHOUSE_LEVEL || stage.key === "house_tree";

  // Durasi pop-up teks masuk rumah pohon: muncul 6 detik saat halaman dibuka, lalu fade out
  useEffect(() => {
    if (!isTreehouseReady) return;
    setShowTreeBadge(true);
    const timer = setTimeout(() => {
      setShowTreeBadge(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [isTreehouseReady]);

  // Format Hari-Tanggal-Bulan-Tahun
  const tanggal = now
    ? `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`
    : "";
  const jam = now
    ? `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <main className="relative h-screen w-full overflow-hidden bg-gradient-sky">
      <h1 className="sr-only">TreeNest — Home</h1>

      {/* Latar langit & pegunungan */}
      <img
        src={skyBg}
        alt="Pemandangan hutan dan pegunungan yang tenang"
        width={1920}
        height={1080}
        className="pointer-events-none absolute inset-x-0 bottom-[22%] top-0 h-full w-full object-cover opacity-90"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[color-mix(in_oklab,var(--grass)_55%,transparent)]" />

      {/* Awan */}
      <Cloud className="top-[12%] size-24 opacity-90" duration={70} delay={0} />
      <Cloud className="top-[24%] size-16 opacity-70" duration={95} delay={-30} />
      <Cloud className="top-[6%] size-20 opacity-60" duration={120} delay={-60} />

      {/* Burung */}
      <Bird className="top-[18%]" duration={38} delay={-6} />
      <Bird className="top-[30%] scale-75" duration={52} delay={-25} />

      {/* Tanggal & jam (Elemen Hijau Natural Khas TreeNest) */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-2xl border border-leaf/40 bg-leaf/15 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-forest dark:text-emerald-200 shadow-soft backdrop-blur-md">
        <span>{tanggal}</span>
      </div>
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-2xl border border-leaf/40 bg-leaf/15 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-forest dark:text-emerald-200 shadow-soft backdrop-blur-md">
        <span>{jam} WIB</span>
      </div>

      {/* Kartu level & EXP - Diturunkan ke top-20 agar tidak bertabrakan dengan Jam */}
      <div className="absolute left-1/2 top-20 w-[min(90vw,22rem)] -translate-x-1/2 rounded-3xl border border-card/60 bg-card/75 p-3.5 sm:p-4 shadow-soft backdrop-blur-md z-10">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-foreground">
            Halo, {username} <span className="text-muted-foreground">· {stage.label}</span>
          </p>
          <p className="text-xs font-bold text-primary">Lv {level}</p>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-leaf transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {exp} / {need} EXP · Rumah Pohon terbuka di Level {TREEHOUSE_LEVEL}
        </p>
      </div>

      {/* Tanah lurus */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-ground">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[color-mix(in_oklab,var(--grass)_75%,white)]" />
        <GrassLine />
      </div>

      {/* Pohon utama — Diturunkan pas menancap di tanah */}
      <div className="absolute inset-x-0 bottom-[14%] flex h-[62%] items-end justify-center z-10">
        <div
          onClick={() => (isTreehouseReady ? setShowTreehouse(true) : setShowTreeTip(true))}
          title={isTreehouseReady ? "Klik untuk Masuk ke Rumah Pohon" : `Pohon Level ${level}`}
          className="group relative flex h-full items-end justify-center cursor-pointer select-none transition-transform duration-300 hover:scale-[1.02] active:scale-95"
        >
          {/* Tombol Floating Masuk Rumah Pohon jika Level 20: Tampil di atas pucuk pohon dengan warna hijau emerald */}
          {isTreehouseReady && (
            <div
              className={`absolute -top-10 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
                showTreeBadge
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTreehouse(true);
                }}
                className="animate-bounce flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-gradient-leaf px-4 py-1.5 text-xs font-bold text-white shadow-float backdrop-blur-md transition-all hover:brightness-110 hover:scale-105 active:scale-95"
              >
                <Home className="size-3.5 text-emerald-100" />
                <span>Masuk Rumah Pohon</span>
                <Sparkles className="size-3 text-emerald-200" />
              </button>
            </div>
          )}

          <span className="absolute -bottom-1 left-1/2 h-3 w-28 -translate-x-1/2 rounded-[100%] bg-[color-mix(in_oklab,var(--soil)_35%,transparent)] blur-[3px]" />
          <img
            key={stage.key}
            src={stage.image}
            alt={`Pohonmu saat ini: ${stage.label}`}
            className="animate-grow-in relative origin-bottom object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.15)] group-hover:brightness-105 transition-all"
            style={{ height: `${stage.height}%` }}
          />
        </div>
      </div>

      {/* Semak & rumput kecil */}
      <Bush className="bottom-[14%] left-[6%] w-24" />
      <Bush className="bottom-[13%] left-[24%] w-14 opacity-90" flip />
      <Bush className="bottom-[14%] right-[8%] w-20" flip />
      <Bush className="bottom-[13%] right-[26%] w-12 opacity-90" />

      {/* Bola profil: pengguna + teman tampil (Hanya teman nyata yang dipilih, no dummy) */}
      <div className="absolute inset-x-0 bottom-[9%] h-16 pointer-events-none">
        {/* User's own orb */}
        <Orb
          label="Kamu"
          initials={user?.initials || "ME"}
          hue={user?.hue ?? 150}
          avatarUrl={user?.avatarUrl || undefined}
          duration={26}
          delay={0}
          from={6}
          to={34}
        />

        {/* Real featured friends only */}
        {featuredFriendsList.map((f, i) => (
          <Orb
            key={f.id || f.accountId}
            label={f.name}
            initials={f.initials}
            hue={f.hue}
            avatarUrl={f.avatarUrl || undefined}
            duration={30 + i * 7}
            delay={-(i + 1) * 9}
            from={38 + i * 17}
            to={48 + i * 17}
          />
        ))}
      </div>

      {/* Modal Rumah Pohon saat Pohon Level 20 diklik */}
      {showTreehouse && (
        <TreehouseModal
          uid={authProfile?.uid || "guest"}
          username={username}
          level={level}
          onClose={() => setShowTreehouse(false)}
        />
      )}

      {/* Tooltip Popup Pertumbuhan Pohon jika belum Level 20 */}
      {showTreeTip && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowTreeTip(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex size-14 items-center justify-center rounded-3xl bg-leaf/15 text-leaf mx-auto shadow-inner">
              <TreePine className="size-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Pohonmu Sedang Bertumbuh 🌱
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Pohonmu saat ini berada di <strong>Level {level} ({stage.label})</strong>.
              </p>
              <div className="mt-3 rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground text-left space-y-1.5">
                <p className="font-bold text-foreground">🏡 Kunci Membuka Rumah Pohon:</p>
                <p>• Capai <strong>Level {TREEHOUSE_LEVEL} (House Tree)</strong>.</p>
                <p>• Selesaikan Daily Quest dan aktivitas produktif untuk mengumpulkan EXP.</p>
                <p>• Setelah terbuka, kamu bisa masuk dan memamerkan videomu di sini!</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTreeTip(false)}
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Semangat Menanam! 🌿
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Orb({
  label,
  initials,
  hue,
  avatarUrl,
  duration,
  delay,
  from,
  to,
}: {
  label: string;
  initials: string;
  hue: number;
  avatarUrl?: string | undefined;
  duration: number;
  delay: number;
  from: number;
  to: number;
}) {
  return (
    <div
      className="animate-stroll absolute bottom-0"
      style={
        {
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          "--stroll-from": `${from}%`,
          "--stroll-to": `${to}%`,
        } as React.CSSProperties
      }
    >
      <div className="animate-float-y flex flex-col items-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={label}
            className="size-11 rounded-full object-cover shadow-float ring-2 ring-card/70"
          />
        ) : (
          <span
            className="flex size-11 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-float ring-2 ring-card/70"
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

function Cloud({
  className,
  duration,
  delay,
}: {
  className: string;
  duration: number;
  delay: number;
}) {
  return (
    <div
      className={`animate-drift pointer-events-none absolute ${className}`}
      style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 100 48" className="size-full" aria-hidden="true">
        <g fill="var(--cloud)">
          <ellipse cx="32" cy="30" rx="26" ry="16" />
          <ellipse cx="58" cy="24" rx="22" ry="18" />
          <ellipse cx="76" cy="32" rx="18" ry="12" />
        </g>
      </svg>
    </div>
  );
}

function Bird({
  className,
  duration,
  delay,
}: {
  className: string;
  duration: number;
  delay: number;
}) {
  return (
    <div
      className={`animate-fly-by pointer-events-none absolute left-0 ${className}`}
      style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 44 22" className="w-9 overflow-visible" aria-hidden="true">
        <path
          d="M2 14 C 8 6, 14 6, 22 13 C 30 6, 36 6, 42 14"
          fill="none"
          stroke="oklch(0.35 0.05 150 / 0.75)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

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

function Bush({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <svg viewBox="0 0 80 40" className="w-full" aria-hidden="true">
        <path
          d="M4 40 C 2 24, 18 10, 32 18 C 38 6, 56 6, 64 18 C 76 12, 82 28, 76 40 Z"
          fill="var(--leaf-soft)"
          opacity="0.9"
        />
        <path
          d="M12 40 C 8 28, 22 18, 34 24 C 40 14, 54 14, 60 24 C 70 20, 74 32, 68 40 Z"
          fill="var(--leaf)"
        />
      </svg>
    </div>
  );
}
