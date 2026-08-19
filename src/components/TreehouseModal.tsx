import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Sparkles,
  Film,
  Trophy,
  Users,
  Video,
  ExternalLink,
  ChevronRight,
  Home,
  CheckCircle2,
  TreePine,
} from "lucide-react";
import { getUserVideos, getFeaturedVideoId, getUserFriends, getFeaturedFriends } from "@/lib/firestore-service";
import { youtubeId, type GalleryVideo, type Friend } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

interface TreehouseModalProps {
  uid: string;
  username: string;
  level: number;
  onClose: () => void;
}

export function TreehouseModal({ uid, username, level, onClose }: TreehouseModalProps) {
  const [featuredVideo, setFeaturedVideo] = useState<GalleryVideo | null>(null);
  const [videoPlayUrl, setVideoPlayUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [visitingFriends, setVisitingFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let active = true;
    async function loadTreehouseData() {
      setLoading(true);
      try {
        const [videos, fid, friends, featIds] = await Promise.all([
          getUserVideos(uid),
          getFeaturedVideoId(uid),
          getUserFriends(uid),
          getFeaturedFriends(uid),
        ]);

        if (!active) return;
        setFriendsCount(friends.length);

        // Cari video yang sedang dijadikan featured & approved
        const feat: GalleryVideo | null =
          videos.find((v) => v.id === fid && v.status === "approved") ||
          videos.find((v) => v.status === "approved") ||
          null;
        setFeaturedVideo(feat);

        if (feat) {
          const resolved = await resolveVideoUrl(feat.url, feat.id);
          if (active) setVideoPlayUrl(resolved);
        }

        // Teman yang berkunjung (featured friends)
        const visitors = friends
          .filter((f) => featIds.includes(f.id) || featIds.includes(f.accountId))
          .slice(0, 5);
        setVisitingFriends(visitors);
      } catch (err) {
        console.error("Error loading treehouse data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTreehouseData();
    return () => {
      active = false;
    };
  }, [uid]);

  const yt = featuredVideo ? youtubeId(featuredVideo.url) : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-500/30 bg-card shadow-float animate-in zoom-in-95 duration-200">
        {/* Header Rumah Pohon */}
        <div className="relative flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-inner">
              <Home className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Rumah Pohon {username}</h2>
                <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black tracking-wide text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3" /> LEVEL {level} MAX
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sanctuary pribadi & pameran video kebanggaanmu di puncak pohon
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Isi Sanctuary (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* 1. Layar Proyektor Video Rumah Pohon */}
          <div className="overflow-hidden rounded-3xl border-2 border-amber-600/30 bg-neutral-950 shadow-float">
            <div className="flex items-center justify-between border-b border-amber-900/40 bg-neutral-900 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Film className="size-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-200">
                  {featuredVideo ? `Pameran Video: ${featuredVideo.title}` : "Layar Pameran Rumah Pohon"}
                </span>
              </div>
              {featuredVideo && (
                <span className="flex items-center gap-1 rounded-md bg-leaf/20 px-2 py-0.5 text-[10px] font-semibold text-leaf">
                  <CheckCircle2 className="size-3" /> Featured Video
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex aspect-video w-full items-center justify-center text-xs text-neutral-400">
                Memuat Rumah Pohon...
              </div>
            ) : featuredVideo ? (
              <div className="aspect-video w-full bg-black">
                {yt ? (
                  <iframe
                    className="size-full"
                    src={`https://www.youtube.com/embed/${yt}?autoplay=0`}
                    title={featuredVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="size-full object-contain"
                    src={videoPlayUrl || featuredVideo.url}
                    controls
                    controlsList="nodownload"
                  />
                )}
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center bg-gradient-to-b from-neutral-900 to-neutral-950">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <Video className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-200">Belum Ada Video Dipamerkan</p>
                  <p className="mt-1 max-w-sm text-xs text-neutral-400">
                    Unggah videomu di TreeGallery, tunggu persetujuan admin, lalu klik tombol bintang untuk memamerkannya di sini!
                  </p>
                </div>
                <Link
                  to="/treegallery"
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 transition-all hover:bg-amber-400 active:scale-95"
                >
                  Buka TreeGallery <ExternalLink className="size-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* 2. Suasana Sanctuary & Informasi Rumah Pohon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kartu Milestone Master Tree */}
            <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Trophy className="size-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Milestone Tertinggi</h3>
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">Master of TreeNest 🌿</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Pohonmu telah mencapai evolusi penuh (House Tree). Selamat atas pencapaian dedikasi dan pertumbuhanmu!
              </p>
            </div>

            {/* Tamu yang Berkunjung */}
            <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Teman Berkunjung</h3>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{friendsCount} Teman</span>
              </div>
              {visitingFriends.length > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                  {visitingFriends.map((f, i) => (
                    <div
                      key={i}
                      title={f.name}
                      className="size-8 rounded-full overflow-hidden border-2 border-card ring-1 ring-primary/30 flex items-center justify-center font-bold text-white text-[10px]"
                      style={{
                        backgroundColor: `oklch(0.65 0.14 ${f.hue})`,
                      }}
                    >
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt={f.name} className="size-full object-cover" />
                      ) : (
                        f.initials
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Pilih Teman Tampil di Friend Club agar mereka ikut berteduh di rumah pohonmu.
                </p>
              )}
            </div>
          </div>

          {/* Quote Damai */}
          <div className="rounded-2xl border border-leaf/30 bg-leaf/10 p-4 text-center">
            <p className="text-xs font-medium italic text-leaf">
              “Di puncak pohon tertinggi, kedamaian sejati berakar. Selamat menikmati ruang tenangmu di TreeNest.”
            </p>
          </div>
        </div>

        {/* Footer Navigasi */}
        <div className="flex items-center justify-between border-t border-border/70 bg-card px-5 py-3.5">
          <Link
            to="/treegallery"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            Kelola Video di TreeGallery <ChevronRight className="size-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-secondary px-5 py-2 text-xs font-bold text-foreground hover:bg-secondary/70 transition-colors"
          >
            Keluar ke Halaman Utama
          </button>
        </div>
      </div>
    </div>
  );
}
