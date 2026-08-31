import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import tree1Img from "@/assets/tree-1.png";
import tree2Img from "@/assets/tree-2.png";
import tree3Img from "@/assets/tree-3.png";
import tree4Img from "@/assets/tree-4.png";
import pohonCemaraImg from "@/assets/Pohon Cemara.png";
import bushImg from "@/assets/bush.png";
import { DEMO_USER, expNeeded, stageForLevel, TREEHOUSE_LEVEL } from "@/lib/treenest";
import { getUserFriends, getFeaturedFriends, getUserProfile, searchUserByAccountId } from "@/lib/firestore-service";
import type { Friend } from "@/lib/social";
import type { UserProfile as FirestoreUserProfile } from "@/lib/firestore-service";
import { TreehouseModal } from "@/components/TreehouseModal";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { Sparkles, Home, ChevronRight, X, TreePine } from "lucide-react";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { visit?: string | undefined } => ({
    visit: typeof search["visit"] === "string" ? search["visit"] : undefined,
  }),
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

function HomePage() {
  const { profile: authProfile } = useAuth();
  const { visit: visitAccountId } = Route.useSearch();
  const isVisiting = Boolean(visitAccountId);

  const user = authProfile || {
    username: "Pengguna",
    accountId: "TN-0000",
    initials: "TN",
    hue: 150,
    avatarUrl: "",
    level: 1,
    exp: 0,
  };
  const level = user.level;
  const exp = user.exp;
  const username = user.username;

  // State for own featured friends
  const [featuredFriendsList, setFeaturedFriendsList] = useState<Friend[]>([]);
  const [showTreehouse, setShowTreehouse] = useState(false);
  const [showTreeTip, setShowTreeTip] = useState(false);
  const [showTreeBadge, setShowTreeBadge] = useState(true);
  const [selectedFriendAccountId, setSelectedFriendAccountId] = useState<string | null>(null);

  useScrollLock(Boolean(showTreehouse || selectedFriendAccountId || showTreeTip));

  // State for visited profile (visiting mode)
  const [visitedProfile, setVisitedProfile] = useState<FirestoreUserProfile | null>(null);
  const [visitedFriends, setVisitedFriends] = useState<Friend[]>([]);
  const [isVisitedFriend, setIsVisitedFriend] = useState(false);

  // Load logged-in user's own featured friends
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

  // Load visited user's profile when ?visit= param is present
  useEffect(() => {
    setShowTreehouse(false);
    setSelectedFriendAccountId(null);
    if (!visitAccountId) {
      setVisitedProfile(null);
      setVisitedFriends([]);
      return;
    }
    (async () => {
      let found: FirestoreUserProfile | null = await searchUserByAccountId(visitAccountId);
      if (!found) found = await getUserProfile(visitAccountId);
      setVisitedProfile(found);

      if (found) {
        const [allFriends, featuredIds] = await Promise.all([
          getUserFriends(found.uid),
          getFeaturedFriends(found.uid),
        ]);
        const featured = allFriends.filter(
          (f) => featuredIds.includes(f.id) || featuredIds.includes(f.accountId),
        );
        setVisitedFriends(featured.slice(0, 4));

        // Check jika viewer adalah teman dari yang dikunjungi
        if (authProfile?.uid) {
          const viewerFriends = await getUserFriends(authProfile.uid);
          const isFr = viewerFriends.some((f) => f.accountId === found!.accountId || f.uid === found!.uid);
          setIsVisitedFriend(isFr);
        }
      }
    })();
  }, [visitAccountId, authProfile?.uid]);

  // Data yang akan ditampilkan: milik yang dikunjungi jika visiting mode, atau milik sendiri
  const displayProfile = isVisiting && visitedProfile ? visitedProfile : user;
  const displayLevel = Math.min(20, displayProfile.level);
  const displayFriends = isVisiting ? visitedFriends : featuredFriendsList;

  const stage = useMemo(() => stageForLevel(displayLevel), [displayLevel]);
  const need = expNeeded(level);
  const pct = Math.min(100, Math.round((exp / need) * 100));
  const isTreehouseReady = displayLevel >= TREEHOUSE_LEVEL || stage.key === "house_tree";

  // Durasi pop-up teks masuk rumah pohon: muncul 3 detik saat halaman dibuka, lalu fade out
  useEffect(() => {
    if (!isTreehouseReady || isVisiting) return;
    setShowTreeBadge(true);
    const timer = setTimeout(() => {
      setShowTreeBadge(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isTreehouseReady, isVisiting]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-gradient-sky">
      <h1 className="sr-only">TreeNest — Home</h1>

      {/* Scene latar: langit gradien, bukit, treeline, awan, burung */}
      <SceneBackground />

      {/* Awan — 7 Awan melayang di berbagai ketinggian & kecepatan */}
      <Cloud className="top-[4%] w-32 opacity-90" duration={65} delay={0} />
      <Cloud className="top-[10%] w-24 opacity-75" duration={88} delay={-24} />
      <Cloud className="top-[16%] w-28 opacity-85" duration={78} delay={-52} />
      <Cloud className="top-[22%] w-20 opacity-65" duration={105} delay={-15} />
      <Cloud className="top-[28%] w-36 opacity-80" duration={95} delay={-42} />
      <Cloud className="top-[34%] w-22 opacity-60" duration={115} delay={-70} />
      <Cloud className="top-[8%] w-18 opacity-50" duration={130} delay={-85} />

      {/* Burung */}
      <Bird className="top-[17%]" duration={40} delay={-7} />
      <Bird className="top-[28%] scale-75" duration={56} delay={-27} />

      {/* Kartu level & EXP — HANYA tampil jika BUKAN visiting mode */}
      {!isVisiting && (
        <div className="absolute left-1/2 top-6 w-[min(90vw,22rem)] -translate-x-1/2 rounded-3xl border border-primary/50 bg-gradient-soft p-3.5 sm:p-4 shadow-soft backdrop-blur-md z-10 transition-all duration-300 hover:scale-105 hover:border-white cursor-pointer">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-foreground">
              Halo, {username} <span className="text-muted-foreground">· {stage.label}</span>
            </p>
            <p className="text-xs font-bold text-primary">Lv {level}</p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/10 border border-white/90 shadow-xs dark:bg-secondary/80">
            <div
              className="h-full rounded-full bg-gradient-leaf transition-[width] duration-700 shadow-xs"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground text-center font-bold">
            {exp} / {need} EXP · Rumah Pohon terbuka di Level {TREEHOUSE_LEVEL}
          </p>
        </div>
      )}

      {/* Banner Visiting Mode — tampil saat mengunjungi Home Page user lain */}
      {isVisiting && visitedProfile && (
        <div
          onClick={() => setSelectedFriendAccountId(visitedProfile.accountId)}
          className="absolute left-1/2 top-6 w-[min(90vw,22rem)] -translate-x-1/2 rounded-3xl border border-primary/50 bg-card dark:bg-gradient-soft p-3.5 sm:p-4 shadow-soft backdrop-blur-md z-10 animate-in fade-in duration-300 transition-all hover:scale-[1.02] cursor-pointer"
          title={`Klik untuk melihat profil ${visitedProfile.username}`}
        >
          <div className="flex items-center gap-3">
            {visitedProfile.avatarUrl ? (
              <img
                src={visitedProfile.avatarUrl}
                alt={visitedProfile.username}
                className="size-10 rounded-full object-cover ring-2 ring-black dark:ring-white shrink-0"
              />
            ) : (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ring-2 ring-black dark:ring-white"
                style={{
                  backgroundImage: `linear-gradient(140deg, oklch(0.78 0.11 ${visitedProfile.hue}), oklch(0.66 0.13 ${visitedProfile.hue + 25}))`,
                }}
              >
                {visitedProfile.initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{visitedProfile.username}</p>
              <p className="text-xs text-muted-foreground">
                Lv {displayLevel} · {stage.label}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground/80 text-center font-bold">
            Kamu sedang mengunjungi Home Page milik "{visitedProfile.username}"
          </p>
        </div>
      )}

      {/* Tanah lurus — Permukaan rumput berada di bottom-[20%] di atas BottomNav */}
      <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-ground">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[color-mix(in_oklab,var(--grass)_75%,white)]" />
        <GrassLine />
      </div>

      {/* Pohon utama — Berdiri menancap di rumput (bottom-[20%]) di atas BottomNav tanpa bentrok */}
      <div className="absolute inset-x-0 bottom-[17%] flex h-[48%] items-end justify-center z-10">
        <div
          onClick={() => {
            if (isVisiting && isTreehouseReady) {
              setShowTreehouse(true);
            } else if (!isVisiting) {
              isTreehouseReady ? setShowTreehouse(true) : setShowTreeTip(true);
            }
          }}
          title={isTreehouseReady ? "Klik untuk Masuk ke Rumah Pohon" : `Pohon Level ${displayLevel}`}
          className="group relative flex h-full items-end justify-center cursor-pointer select-none transition-transform duration-300 hover:scale-[1.02] active:scale-95"
        >
          {/* Tombol Floating Masuk Rumah Pohon: 100% seragam dengan Notifikasi & EXP card */}
          {isTreehouseReady && (
            <div
              className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
                showTreeBadge && !isVisiting
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
                className="animate-bounce inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-primary/50 bg-gradient-soft px-4 py-2 text-xs font-bold text-foreground shadow-soft backdrop-blur-md transition-all hover:scale-105 hover:border-white cursor-pointer select-none dark:border-primary/50 dark:bg-card dark:text-foreground dark:hover:border-primary"
              >
                <Home className="size-4 text-primary shrink-0" />
                <span className="whitespace-nowrap font-bold text-foreground">
                  {isVisiting ? `Rumah Pohon ${visitedProfile?.username || ""}` : "Masuk Rumah Pohon"}
                </span>
              </button>
            </div>
          )}

          <span className="absolute -bottom-1 left-1/2 h-3 w-28 -translate-x-1/2 rounded-[100%] bg-[color-mix(in_oklab,var(--soil)_35%,transparent)] blur-[3px]" />
          <img
            key={stage.key}
            src={stage.image}
            alt={`Pohon${isVisiting ? ` milik ${visitedProfile?.username || "user lain"}` : "mu saat ini"}: ${stage.label}`}
            className="animate-grow-in relative origin-bottom object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.15)] group-hover:brightness-105 transition-all"
            style={{ height: `${stage.height}%` }}
          />
        </div>
      </div>

      {/* Semak & rumput — Tersebar rapi, berdempetan harmonis tanpa saling menabrak berat */}
      {/* Sisi Kiri */}
      <Bush className="bottom-[19.2%] left-[1.5%] w-22 z-10 opacity-95" delay="0.2s" />
      <Bush className="bottom-[19.8%] left-[9.5%] w-14 z-10 opacity-85" flip delay="1.1s" />
      <Bush className="bottom-[19.2%] left-[18%] w-20 z-10 opacity-95" delay="0.6s" />
      <Bush className="bottom-[19.8%] left-[26.5%] w-14 z-10 opacity-85" flip delay="1.5s" />
      <Bush className="bottom-[19.0%] left-[35%] w-15 z-10 opacity-90" delay="0.8s" />

      {/* Sisi Kanan */}
      <Bush className="bottom-[19.0%] right-[35%] w-15 z-10 opacity-90" flip delay="1.3s" />
      <Bush className="bottom-[19.8%] right-[26.5%] w-14 z-10 opacity-85" delay="1.7s" />
      <Bush className="bottom-[19.2%] right-[18%] w-20 z-10 opacity-95" flip delay="0.5s" />
      <Bush className="bottom-[19.8%] right-[9.5%] w-14 z-10 opacity-85" delay="1.2s" />
      <Bush className="bottom-[19.2%] right-[1.5%] w-22 z-10 opacity-95" flip delay="0.3s" />

      {/* Bola profil: pengguna + teman tampil (Berjalan anggun di atas permukaan rumput) */}
      <div className="absolute inset-x-0 bottom-[14%] h-16 z-10">
        {/* Jika bukan visiting mode: tampilkan orb milik sendiri */}
        {!isVisiting && (
          <Orb
            label="Kamu"
            initials={user?.initials || "ME"}
            hue={user?.hue ?? 150}
            avatarUrl={user?.avatarUrl || undefined}
            duration={26}
            delay={0}
            from={6}
            to={34}
            onClick={() => setSelectedFriendAccountId(user.accountId)}
          />
        )}

        {/* Orbs teman yang tampil (milik sendiri atau milik yang dikunjungi) */}
        {displayFriends.map((f, i) => (
          <Orb
            key={f.id || f.accountId}
            label={f.name}
            initials={f.initials}
            hue={f.hue}
            avatarUrl={f.avatarUrl || undefined}
            duration={30 + i * 7}
            delay={-(i + 1) * 9}
            from={isVisiting ? 15 + i * 17 : 38 + i * 17}
            to={isVisiting ? 28 + i * 17 : 48 + i * 17}
            onClick={() => setSelectedFriendAccountId(f.accountId)}
          />
        ))}
      </div>

      {/* Modal Rumah Pohon */}
      {showTreehouse && isTreehouseReady && (
        <TreehouseModal
          uid={isVisiting && visitedProfile ? visitedProfile.uid : (authProfile?.uid || "guest")}
          username={isVisiting && visitedProfile ? visitedProfile.username : username}
          level={displayLevel}
          onClose={() => setShowTreehouse(false)}
          viewerUid={authProfile?.uid}
          isFriend={isVisitedFriend}
          treehouseVideoPrivacy={
            isVisiting && visitedProfile ? visitedProfile.treehouseVideoPrivacy : undefined
          }
        />
      )}

      {/* PublicProfileModal saat bola profil teman diklik */}
      {selectedFriendAccountId && (
        <PublicProfileModal
          accountId={selectedFriendAccountId}
          viewerUid={authProfile?.uid ?? ""}
          viewerFriends={featuredFriendsList}
          isFriend={true}
          disableVisit={isVisiting}
          onClose={() => setSelectedFriendAccountId(null)}
        />
      )}

      {/* Tooltip Popup Pertumbuhan Pohon jika belum Level 20 */}
      {!isVisiting && showTreeTip && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowTreeTip(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150 dark:border-emerald-500/30 dark:bg-emerald-950/95 dark:shadow-emerald-950/60"
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
              className="w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white"
            >
              Semangat Menanam!
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
  onClick,
}: {
  label: string;
  initials: string;
  hue: number;
  avatarUrl?: string | undefined;
  duration: number;
  delay: number;
  from: number;
  to: number;
  onClick?: (() => void) | undefined;
}) {
  const isClickable = !!onClick;
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
      <div
        className={`animate-float-y flex flex-col items-center ${isClickable ? "cursor-pointer" : "pointer-events-none"}`}
        onClick={onClick}
        title={isClickable ? `Lihat profil ${label}` : undefined}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={label}
            className={`size-11 rounded-full object-cover shadow-float ring-2 ring-card/70 transition-transform ${isClickable ? "hover:scale-110 hover:ring-primary/60" : ""}`}
          />
        ) : (
          <span
            className={`flex size-11 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-float ring-2 ring-card/70 transition-transform ${isClickable ? "hover:scale-110 hover:ring-primary/60" : ""}`}
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

/* ─────────────────────────────────────────────────────────
   SceneBackground — seluruh layer latar belakang Home Page
   Menggunakan Gambar Pohon Cemara (src/assets/Pohon Cemara.png)
───────────────────────────────────────────────────────── */
function SceneBackground() {
  // Pohon Latar Belakang Cemara — terdistribusi alami & berlapis selayaknya hutan pinus di horizon tanah (bottom-[20%])
  const horizonTrees = [
    // Sisi Kiri & Tepi Kiri Nembus Layar
    { img: pohonCemaraImg, pos: "-left-[4%]", height: "h-48", bottom: "bottom-0", opacity: "opacity-90", delay: "0s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "left-[3.5%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.4s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "left-[8%]", height: "h-44", bottom: "bottom-0", opacity: "opacity-90", delay: "0.7s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "left-[15%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.8s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "left-[20%]", height: "h-44", bottom: "bottom-0", opacity: "opacity-90", delay: "0.4s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "left-[27%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.2s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "left-[32%]", height: "h-42", bottom: "bottom-0", opacity: "opacity-90", delay: "0.5s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "left-[38%]", height: "h-46", bottom: "bottom-0", opacity: "opacity-90", delay: "1.6s", anim: "animate-sway" },

    // Area Tengah (Di Belakang Pohon Utama)
    { img: pohonCemaraImg, pos: "left-[45%]", height: "h-42", bottom: "bottom-0", opacity: "opacity-85", delay: "0.9s", anim: "animate-breeze" },
    

    // Sisi Kanan & Tepi Kanan Nembus Layar (Persis Simetris dengan Sisi Kiri)
    { img: pohonCemaraImg, pos: "right-[38%]", height: "h-46", bottom: "bottom-0", opacity: "opacity-90", delay: "1.6s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "right-[32%]", height: "h-42", bottom: "bottom-0", opacity: "opacity-90", delay: "0.5s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "right-[27%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.2s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "right-[20%]", height: "h-44", bottom: "bottom-0", opacity: "opacity-90", delay: "0.4s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "right-[15%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.8s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "right-[8%]", height: "h-44", bottom: "bottom-0", opacity: "opacity-90", delay: "0.7s", anim: "animate-breeze" },
    { img: pohonCemaraImg, pos: "right-[3.5%]", height: "h-36", bottom: "bottom-0", opacity: "opacity-85", delay: "1.4s", anim: "animate-sway" },
    { img: pohonCemaraImg, pos: "-right-[4%]", height: "h-48", bottom: "bottom-0", opacity: "opacity-90", delay: "0s", anim: "animate-breeze" },
  ];

  return (
    <>
      {/* ── Langit gradien cerah statis (TIDAK BERUBAH di Mode Gelap) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.76 0.08 226) 0%, oklch(0.86 0.055 220) 35%, oklch(0.90 0.045 190) 65%, oklch(0.88 0.07 155) 100%)",
        }}
      />

      {/* ── Matahari Ambient (Statis) ── */}
      <div
        aria-hidden="true"
        className="animate-sun-glow pointer-events-none absolute right-[10%] top-[6%] size-64 rounded-full bg-amber-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[16%] top-[10%] size-16 rounded-full bg-amber-100/90 shadow-[0_0_50px_rgba(253,224,71,0.5)]"
      />

      {/* ── 5 Gunung Simetris Rapi & Ukuran Besar (Puncak Gunung A & E Tepat di Tepi Layar Kiri & Kanan x=0 & x=1440) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[20%] h-64 select-none overflow-hidden z-0">
        <svg
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
          className="size-full"
        >
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

          {/* Gunung C — Tengah (Puncak O = 220px tinggi, peak x=720 tepat di tengah layar) */}
          <path
            d="M 440 240 L 720 20 L 1000 240 Z"
            fill="url(#mntGradC)"
            opacity="0.95"
          />

          {/* Gunung B — Kiri Tengah (Puncak y = 185px tinggi, peak x=360) */}
          <path
            d="M 120 240 L 360 55 L 600 240 Z"
            fill="url(#mntGradBD)"
            opacity="0.9"
          />

          {/* Gunung D — Kanan Tengah (Puncak y = 185px tinggi, peak x=1080) */}
          <path
            d="M 840 240 L 1080 55 L 1320 240 Z"
            fill="url(#mntGradBD)"
            opacity="0.9"
          />

          {/* Gunung A — Paling Kiri (Midpoint garis kiri tepat di tepi layar kiri x=0, Puncak di x=120) */}
          <path
            d="M -120 240 L 120 100 L 360 240 Z"
            fill="url(#mntGradAE)"
            opacity="0.95"
          />

          {/* Gunung E — Paling Kanan (Midpoint garis kanan tepat di tepi layar kanan x=1440, Puncak di x=1320) */}
          <path
            d="M 1080 240 L 1320 100 L 1560 240 Z"
            fill="url(#mntGradAE)"
            opacity="0.95"
          />
        </svg>
      </div>

      {/* ── Pohon Latar Belakang Cemara (Hutan Alami Abstrak & Rapi di Horizon) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[20%] h-56 select-none z-[1] overflow-hidden">
        {horizonTrees.map((t, idx) => (
          <div
            key={idx}
            className={`${t.anim} absolute ${t.pos} ${t.bottom ?? "bottom-0"} flex items-end ${t.opacity ?? "opacity-90"}`}
            style={{ animationDelay: t.delay }}
          >
            <img
              src={t.img}
              alt=""
              className={`${t.height} w-auto object-contain drop-shadow-sm`}
            />
          </div>
        ))}
      </div>
    </>
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
      <div className="animate-bird-body">
        <svg
          viewBox="0 0 52 36"
          className="h-8 w-11 overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
          aria-hidden="true"
        >
          {/* Sayap Belakang (Far Wing) — Putih Bayangan Halus untuk Kedalaman */}
          <path
            className="animate-bird-wing-far"
            d="M 22 13 C 19 4, 11 -2, 6 0 C 10 5, 15 9, 22 13 Z"
            fill="oklch(0.90 0.015 220)"
          />

          {/* Tubuh, Kepala, Paruh Mengarah ke Kanan, dan Ekor Aerodinamis (Putih Bersih) */}
          <path
            d="M 47 15.5 L 41 13.5 C 38 10.5, 33 10.5, 29 12.5 C 22 12.5, 15 16, 2 22 C 7 22.5, 12 21.5, 15 20 C 18 24.5, 27 24, 34 19.5 C 38 17.5, 41 16.5, 47 15.5 Z"
            fill="oklch(0.98 0.005 220)"
          />

          {/* Aksen Mata Burung (Hitam Tegas) */}
          <circle cx="36" cy="13.5" r="0.9" fill="oklch(0.20 0.02 240)" />

          {/* Sayap Depan (Near Wing) — Putih Bersih di Lapisan Terdepan */}
          <path
            className="animate-bird-wing-near"
            d="M 25 14 C 22 3, 13 -4, 7 -2 C 12 4, 18 9, 25 14 Z"
            fill="oklch(0.99 0.005 220)"
          />
        </svg>
      </div>
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
  delay,
}: {
  className?: string;
  flip?: boolean;
  delay?: string;
}) {
  return (
    <div
      className={`animate-breeze pointer-events-none absolute select-none ${className ?? ""}`}
      style={{
        transform: flip ? "scaleX(-1)" : undefined,
        animationDelay: delay,
      }}
    >
      <img
        src={bushImg}
        alt=""
        className="h-auto w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.12)]"
      />
    </div>
  );
}
