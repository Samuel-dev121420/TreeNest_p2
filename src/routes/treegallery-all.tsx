import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Play,
  Star,
  MessageSquare,
  Trash2,
  Film,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth-context";
import {
  getUserVideos,
  deleteGalleryVideo,
  setFeaturedVideo,
  getFeaturedVideoId,
  getAllApprovedVideos,
  type UserProfile,
} from "@/lib/firestore-service";
import { youtubeId, timeAgo, type GalleryVideo, type GalleryVideoSource } from "@/lib/social";
import { resolveVideoUrl } from "@/lib/video-storage";

export const Route = createFileRoute("/treegallery-all")({
  head: () => ({
    meta: [
      { title: "Semua Video — TreeGallery" },
      {
        name: "description",
        content: "Jelajahi seluruh koleksi video tayang di TreeGallery.",
      },
    ],
  }),
  component: AllVideosPage,
});

function AllVideosPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const uid = profile?.uid ?? "guest";

  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [preview, setPreview] = useState<GalleryVideo | null>(null);
  const [viewCommentVideo, setViewCommentVideo] = useState<GalleryVideo | null>(null);

  const [readComments, setReadComments] = useState<Record<string, boolean>>(() => {
    try {
      const local = localStorage.getItem("treenest_read_comments");
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  const markCommentAsRead = useCallback((videoId: string) => {
    setReadComments((prev) => {
      if (prev[videoId]) return prev;
      const updated = { ...prev, [videoId]: true };
      localStorage.setItem("treenest_read_comments", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allVids, fid] = await Promise.all([
      getAllApprovedVideos(),
      getFeaturedVideoId(uid),
    ]);
    setVideos(allVids);
    setFeaturedId(fid);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.title.toLowerCase().includes(q));
  }, [videos, searchQuery]);

  async function toggleFeatured(videoId: string) {
    const newFid = featuredId === videoId ? null : videoId;
    setFeaturedId(newFid);
    await setFeaturedVideo(uid, newFid);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus video ini dari galeri?")) return;
    await deleteGalleryVideo(id, uid);
    setVideos((prev) => prev.filter((v) => v.id !== id));
    if (featuredId === id) setFeaturedId(null);
  }

  return (
    <PageShell title="" description="">
      <div className="mx-auto max-w-5xl space-y-6 select-none">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <button
            onClick={() => navigate({ to: "/treegallery" })}
            className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card px-4 py-2 text-xs font-bold text-foreground shadow-soft transition-all hover:bg-secondary active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4" /> Kembali ke TreeGallery
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-card border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Page Title & Description */}
        <div>
          <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
            Seluruh Galeri Tayang TreeGallery
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Jelajahi dan tonton seluruh video yang telah disetujui dari seluruh pengguna TreeNest.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul video..."
            className="w-full rounded-2xl border border-input bg-card py-3 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-soft focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-muted-foreground">
            Memuat seluruh koleksi video...
          </div>
        ) : filteredVideos.length === 0 ? (
          <EmptyState
            icon={Film}
            title={searchQuery ? "Video tidak ditemukan" : "Belum ada video tayang"}
            description={
              searchQuery
                ? "Coba kata kunci pencarian lain."
                : "Belum ada video yang disetujui Admin."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((v) => {
              const yt = youtubeId(v.url);
              const isFeatured = featuredId === v.id;
              const isOwner = v.uid === uid;

              return (
                <div
                  key={v.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-border/80 bg-card shadow-soft dark:border-border/70 hover:border-primary/50 transition-all"
                >
                  {/* Thumbnail & Play Trigger */}
                  <button
                    onClick={() => setPreview(v)}
                    className="relative aspect-video w-full overflow-hidden bg-secondary cursor-pointer"
                  >
                    <VideoThumbnail video={v} yt={yt} />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                      <Play className="size-10 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    {isFeatured && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-soft">
                        <Star className="size-3 fill-current" /> Rumah Pohon
                      </span>
                    )}
                    <SourceBadge source={v.sourceType} />
                  </button>

                  {/* Details */}
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(v.submittedAt)}</p>

                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/40">
                      {isOwner && (
                        <button
                          onClick={() => toggleFeatured(v.id)}
                          className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors ${
                            isFeatured
                              ? "bg-leaf/15 text-leaf font-bold"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                          }`}
                        >
                          {isFeatured ? "Tampil di Rumah Pohon" : "Jadikan Tayangan"}
                        </button>
                      )}

                      {/* Catatan Admin jika ada */}
                      {v.approvalComment && isOwner && (
                        <button
                          onClick={() => {
                            setViewCommentVideo(v);
                            markCommentAsRead(v.id);
                          }}
                          title="Lihat Catatan Admin"
                          className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <MessageSquare className="size-4" />
                          {!readComments[v.id] && (
                            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                          )}
                        </button>
                      )}

                      {isOwner && (
                        <button
                          onClick={() => handleDelete(v.id)}
                          aria-label="Hapus video"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODAL PLAYER VIDEO ── */}
        {preview && (
          <VideoPlayerModal video={preview} onClose={() => setPreview(null)} />
        )}

        {/* ── MODAL VIEW COMMENT ADMIN ── */}
        {viewCommentVideo && (
          <div
            onClick={() => setViewCommentVideo(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-float space-y-4 animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Catatan Admin</h3>
                </div>
                <button
                  onClick={() => setViewCommentVideo(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground">Video:</p>
                <p className="text-sm font-semibold text-foreground">{viewCommentVideo.title}</p>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs font-medium text-foreground leading-relaxed">
                {viewCommentVideo.approvalComment || "Tidak ada catatan tertulis dari Admin."}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setViewCommentVideo(null)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function VideoThumbnail({ video, yt }: { video: GalleryVideo; yt: string | null }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (
      !yt &&
      (video.sourceType === "upload" ||
        video.url.startsWith("indexeddb:") ||
        video.url.startsWith("blob:"))
    ) {
      resolveVideoUrl(video.url, video.id).then((u) => {
        if (active && u) setLocalUrl(u);
      });
    }
    return () => {
      active = false;
    };
  }, [video.url, video.id, video.sourceType, yt]);

  if (yt) {
    return (
      <img
        src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`}
        alt={video.title}
        className="size-full object-cover"
      />
    );
  }

  if (localUrl) {
    return <video src={localUrl} className="size-full object-cover" muted preload="metadata" />;
  }

  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-leaf/20 to-primary/10 text-muted-foreground">
      <Film className="size-10" />
    </div>
  );
}

function SourceBadge({ source }: { source: GalleryVideoSource }) {
  const labelMap: Record<GalleryVideoSource, string> = {
    youtube: "YouTube",
    tiktok: "TikTok",
    upload: "File Upload",
    link: "Link",
  };
  return (
    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
      {labelMap[source] ?? source}
    </span>
  );
}

function VideoPlayerModal({ video, onClose }: { video: GalleryVideo; onClose: () => void }) {
  const yt = youtubeId(video.url);
  const [resolvedUrl, setResolvedUrl] = useState<string>(video.url);

  useEffect(() => {
    let active = true;
    resolveVideoUrl(video.url, video.id).then((u) => {
      if (active && u) setResolvedUrl(u);
    });
    return () => {
      active = false;
    };
  }, [video.url, video.id]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-float animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 bg-card">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {video.sourceType}
            </span>
            <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          {yt ? (
            <iframe
              className="size-full"
              src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.sourceType === "tiktok" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-pink-500/10 to-cyan-500/10">
              <Film className="size-12 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Video Tautan TikTok</p>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <ExternalLink className="size-4" /> Buka di TikTok
              </a>
            </div>
          ) : (
            <video
              className="size-full object-contain"
              src={resolvedUrl || video.url}
              controls
              autoPlay
            />
          )}
        </div>
      </div>
    </div>
  );
}
