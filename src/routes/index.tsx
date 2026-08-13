import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import skyBg from "@/assets/sky-bg.jpg";
import { useAuth } from "@/lib/auth-context";
import { DEMO_FRIENDS, DEMO_USER, expNeeded, stageForLevel, TREEHOUSE_LEVEL } from "@/lib/treenest";

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

  const stage = useMemo(() => stageForLevel(level), [level]);
  const need = expNeeded(level);
  const pct = Math.min(100, Math.round((exp / need) * 100));

  const tanggal = now ? `${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}` : "";
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

      {/* Tanggal & jam */}
      <div className="absolute left-5 top-5 text-sm font-semibold tracking-wide text-foreground/60">
        {tanggal}
      </div>
      <div className="absolute right-5 top-5 text-sm font-semibold tracking-wide text-foreground/60">
        {jam}
      </div>

      {/* Kartu level & EXP */}
      <div className="absolute left-1/2 top-16 w-[min(92vw,22rem)] -translate-x-1/2 rounded-3xl border border-card/60 bg-card/70 p-4 shadow-soft backdrop-blur-md">
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

      {/* Pohon utama — akar menancap di tanah */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[20%] flex h-[58%] items-end justify-center">
        <div className="relative flex h-full items-end justify-center">
          <span className="absolute -bottom-1 left-1/2 h-3 w-28 -translate-x-1/2 rounded-[100%] bg-[color-mix(in_oklab,var(--soil)_35%,transparent)] blur-[3px]" />
          <img
            key={stage.key}
            src={stage.image}
            alt={`Pohonmu saat ini: ${stage.label}`}
            className="animate-grow-in relative origin-bottom object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.10)]"
            style={{ height: `${stage.height}%` }}
          />
        </div>
      </div>

      {/* Semak & rumput kecil */}
      <Bush className="bottom-[19%] left-[6%] w-24" />
      <Bush className="bottom-[18%] left-[24%] w-14 opacity-90" flip />
      <Bush className="bottom-[19%] right-[8%] w-20" flip />
      <Bush className="bottom-[18%] right-[26%] w-12 opacity-90" />

      {/* Bola profil: pengguna + teman tampil */}
      <div className="absolute inset-x-0 bottom-[13%] h-16">
        <Orb label="Kamu" initials="RA" hue={150} duration={26} delay={0} from={6} to={34} />
        {DEMO_FRIENDS.map((f, i) => (
          <Orb
            key={f.id}
            label={f.name}
            initials={f.initials}
            hue={f.hue}
            duration={30 + i * 7}
            delay={-(i + 1) * 9}
            from={38 + i * 17}
            to={48 + i * 17}
          />
        ))}
      </div>
    </main>
  );
}

function Orb({
  label,
  initials,
  hue,
  duration,
  delay,
  from,
  to,
}: {
  label: string;
  initials: string;
  hue: number;
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
        <span
          className="flex size-11 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-float ring-2 ring-card/70"
          style={{
            backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${hue}), oklch(0.66 0.13 ${hue + 25}))`,
          }}
        >
          {initials}
        </span>
        <span className="mt-1 rounded-full bg-card/70 px-2 py-0.5 text-[10px] font-semibold text-foreground/70 backdrop-blur-sm">
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
        <g className="animate-flap" style={{ animationDelay: `${delay}s` }}>
          {/* sayap belakang */}
          <path
            d="M22 13C17 13 13 6.5 8 7.5c-3 .6-5 3-6 5.5 4.5.6 8 1.6 12 3 3 1 6 1.4 8-3Z"
            fill="var(--soil)"
            opacity="0.28"
          />
          {/* badan + kepala */}
          <path
            d="M20 12c3.4-1.6 7-1.4 9.6.4l4.6-1.2c1 .2 1 1 .2 1.6l-3 1.6c-1.2 2.6-4 4.2-7.2 4-2.8-.2-4.8-1.8-5.4-3.6-.3-1 .3-2.2 1.2-2.8Z"
            fill="var(--soil)"
            opacity="0.55"
          />
          {/* sayap depan */}
          <path
            d="M22 12c-4.6-1.6-8.6-6.4-13.4-6-3 .3-5.6 2.2-7.4 4.8 5 .2 9.4 1.4 13.6 3.4 3 1.4 6.2 2.2 7.2-2.2Z"
            fill="var(--soil)"
            opacity="0.45"
          />
        </g>
      </svg>
    </div>
  );
}

function Bush({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <div
      className={`animate-sway pointer-events-none absolute ${className}`}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <svg viewBox="0 0 80 48" className="w-full overflow-visible" aria-hidden="true">
        {/* bayangan menempel tanah */}
        <ellipse cx="40" cy="45" rx="30" ry="3.5" fill="var(--soil)" opacity="0.16" />
        {/* gumpalan daun berlapis, tepi tidak simetris */}
        <path
          d="M6 45c-3-6 0-12 6-13-1-8 6-14 13-11 3-6 12-7 16-2 6-3 13 1 13 7 6 0 10 5 9 10-.5 4-3 8-7 9H6Z"
          fill="var(--leaf)"
        />
        <path
          d="M14 45c-3-4-1-9 4-10 0-6 5-9 10-7 3-4 9-4 11 1 4-2 9 1 9 5 4 .5 6 5 4 8-1 1.6-2.6 2.6-4 3H14Z"
          fill="var(--leaf-soft)"
          opacity="0.85"
        />
        <path
          d="M28 45c-1.6-2.6.4-6 3.6-6.4 1-2.6 4.4-3.4 6.4-1.6 2-2 5.6-1 6.4 1.8 2.6.4 4 3.4 2.6 5.4-.4.6-1 .8-1.6.8H28Z"
          fill="oklch(0.92 0.07 138)"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

/** Rumput tipis di garis tanah supaya sambungan tidak terlihat kaku. */
function GrassLine() {
  const blades = Array.from({ length: 26 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 260 12"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 -top-2 h-3 w-full"
      aria-hidden="true"
    >
      {blades.map((i) => {
        const x = i * 10 + ((i * 37) % 6);
        const h = 5 + ((i * 13) % 6);
        const lean = i % 2 === 0 ? 2.4 : -2.4;
        return (
          <path
            key={i}
            d={`M${x} 12 Q${x + lean} ${12 - h / 2} ${x + lean * 1.6} ${12 - h}`}
            stroke="color-mix(in oklab, var(--grass) 78%, white)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
