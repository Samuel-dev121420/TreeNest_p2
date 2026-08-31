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
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  getUserVideos,
  deleteGalleryVideo,
  setFeaturedVideo,
  getFeaturedVideoId,
  getAllApprovedVideos,
  type UserProfile,
} from "@/lib/firestore-service";
import { youtubeId, tiktokId, fetchTikTokThumbnail, timeAgo, type GalleryVideo, type GalleryVideoSource } from "@/lib/social";
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
  const [deleteTargetVideo, setDeleteTargetVideo] = useState<GalleryVideo | null>(null);

  useScrollLock(Boolean(preview || viewCommentVideo || deleteTargetVideo));

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
                    <SourceBadge source={v.sourceType} />
                  </button>

                  {/* Details */}
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="line-clamp-1 text-sm font-bold text-foreground">{v.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(v.submittedAt)}</p>

                    {/* Status Informasi Rumah Pohon */}
                    {isOwner ? (
                      isFeatured ? (
                        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-leaf text-center">
                          
                          <span>Tampil di Rumah Pohon</span>
                          
                        </div>
                      ) : (
                        <div className="mt-2 h-4" />
                      )
                    ) : (
                      <div className="mt-2 h-4" />
                    )}

                    <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border/40">
                      {isOwner && (
                        <button
                          onClick={() => toggleFeatured(v.id)}
                          className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            isFeatured
                              ? "border border-border/80 bg-secondary/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                          }`}
                        >
                          {isFeatured ? "Hentikan Tayangan" : "Jadikan Tayangan"}
                        </button>
                      )}

                      {/* Tombol Catatan Admin (Selalu tampil untuk semua video di TreeGalleryAll persis seperti di TreeGallery) */}
                      <button
                        onClick={() => {
                          setViewCommentVideo(v);
                          markCommentAsRead(v.id);
                        }}
                        title="Lihat Catatan Admin"
                        className="relative rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer"
                      >
                        <MessageSquare className="size-4" />
                        {((v.status === "approved" && v.approvalComment) || (v.status === "rejected" && v.reason)) && !readComments[v.id] && (
                          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                        )}
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => setDeleteTargetVideo(v)}
                          aria-label="Hapus video"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
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
              className="w-full max-w-md sm:max-w-lg overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            >
              <div>
                <h3 className="text-base font-bold text-foreground">Catatan Moderasi Admin</h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Video: <strong className="text-foreground">"{viewCommentVideo.title}"</strong>
                </p>
              </div>

              {/* Note Box — Full Kotak dengan Border & Teks Hitam (Light) / Putih (Dark) */}
              <div className={`rounded-xl border border-black dark:border-white p-4 text-left shadow-xs transition-all ${
                viewCommentVideo.status === "approved"
                  ? "bg-emerald-50/90 text-black dark:bg-emerald-950/40 dark:text-white"
                  : viewCommentVideo.status === "rejected"
                  ? "bg-rose-50/90 text-black dark:bg-rose-950/40 dark:text-white"
                  : "bg-amber-50/90 text-black dark:bg-amber-950/40 dark:text-white"
              }`}>
                {viewCommentVideo.status === "approved" ? (
                  viewCommentVideo.approvalComment ? (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-black dark:text-white">
                        Catatan Persetujuan Admin:
                      </p>
                      <p className="mt-1 text-xs font-semibold text-black dark:text-white leading-relaxed">
                        "{viewCommentVideo.approvalComment}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                      Admin tidak memberikan catatan khusus untuk persetujuan video ini.
                    </p>
                  )
                ) : viewCommentVideo.status === "rejected" ? (
                  viewCommentVideo.reason ? (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-black dark:text-white">
                        Alasan Penolakan Admin:
                      </p>
                      <p className="mt-1 text-xs font-semibold text-black dark:text-white leading-relaxed">
                        "{viewCommentVideo.reason}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                      Admin tidak mencantumkan alasan penolakan spesifik.
                    </p>
                  )
                ) : (
                  <p className="text-xs font-semibold text-black dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis">
                    Video Anda sedang dalam antrean moderasi Admin.
                  </p>
                )}
              </div>

              <button
                onClick={() => setViewCommentVideo(null)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer shadow-soft active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL KONFIRMASI HAPUS VIDEO CUSTOM (Light & Dark Mode) ── */}
        {deleteTargetVideo && (
          <div
            onClick={() => setDeleteTargetVideo(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Video Ini?</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin menghapus video <strong>"{deleteTargetVideo.title}"</strong> dari galeri?
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    const target = deleteTargetVideo;
                    setDeleteTargetVideo(null);
                    await handleDelete(target.id);
                  }}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90 cursor-pointer shadow-soft"
                >
                  Ya, Hapus Video
                </button>
                <button
                  onClick={() => setDeleteTargetVideo(null)}
                  className="flex-1 rounded-xl border border-border/80 bg-secondary/80 text-secondary-foreground dark:bg-secondary dark:text-foreground py-2.5 text-xs font-bold transition-colors hover:bg-secondary/60 cursor-pointer"
                >
                  Batal
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
  const [tiktokThumb, setTiktokThumb] = useState<string | null>(video.thumbnail || null);

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
    } else if (!yt && video.sourceType === "tiktok" && !video.thumbnail) {
      fetchTikTokThumbnail(video.url).then((thumbUrl) => {
        if (active && thumbUrl) setTiktokThumb(thumbUrl);
      });
    }
    return () => {
      active = false;
    };
  }, [video.url, video.id, video.sourceType, video.thumbnail, yt]);

  if (yt) {
    return (
      <img
        src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`}
        alt={video.title}
        className="size-full object-cover"
      />
    );
  }

  if (tiktokThumb) {
    return (
      <img
        src={tiktokThumb}
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
  const isTikTok = video.sourceType === "tiktok";
  const ttId = isTikTok ? tiktokId(video.url) : null;
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

  function renderPlayer() {
    if (yt) {
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            className="size-full"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (isTikTok) {
      const playerSrc = ttId
        ? `https://www.tiktok.com/player/v1/${ttId}?music_info=0&description=0&controls=1&rel=0&native_context_menu=0&closed_caption=0`
        : null;
      if (!playerSrc) {
        return (
          <div className="flex w-full items-center justify-center bg-black" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
            <a href={video.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground">
              <ExternalLink className="size-4" /> Buka di TikTok
            </a>
          </div>
        );
      }
      return (
        <div className="w-full bg-black overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '65vh' }}>
          <iframe
            className="size-full border-0"
            src={playerSrc}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="aspect-video w-full bg-black">
        <video
          className="size-full object-contain"
          src={resolvedUrl || video.url}
          controls
          autoPlay
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-150 ${
          isTikTok ? "max-w-sm sm:max-w-[390px]" : "max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-card">
          <div className="min-w-0 flex items-center gap-2">
            <span className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary">
              {video.sourceType}
            </span>
            <p className="line-clamp-1 text-sm font-bold text-foreground">{video.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {renderPlayer()}

        <div className="flex items-center justify-between border-t border-border/60 bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Diunggah {timeAgo(video.submittedAt)}
          </p>
          {isTikTok && (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="size-3.5" /> Buka di TikTok
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
