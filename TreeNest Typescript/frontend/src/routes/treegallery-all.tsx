import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  RotateCw,
  ExternalLink,
  Sparkles,
  Settings,
  Info,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
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
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [infoVideo, setInfoVideo] = useState<GalleryVideo | null>(null);

  // ─── Pagination / Infinite Scroll (20 video per sesi) ───
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showActionTime, setShowActionTime] = useState<Record<string, boolean>>({});
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useScrollLock(Boolean(preview || viewCommentVideo || deleteTargetVideo || infoVideo));

  const [readComments, setReadComments] = useState<Record<string, boolean>>(() => {
    try {
      const local = localStorage.getItem("treenest_read_comments");
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  });

  // Track video yang sudah dilihat user
  const [seenApprovedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("treenest_seen_approved_videos");
      if (raw) return new Set<string>(JSON.parse(raw));
      return new Set<string>(["seed-1", "seed-2", "seed-3"]);
    } catch {
      return new Set<string>(["seed-1", "seed-2", "seed-3"]);
    }
  });

  // Simpan video yang tampil sebagai dilihat saat meninggalkan halaman
  useEffect(() => {
    return () => {
      if (videos.length > 0) {
        try {
          const raw = localStorage.getItem("treenest_seen_approved_videos");
          const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
          videos.forEach((v) => set.add(v.id));
          localStorage.setItem("treenest_seen_approved_videos", JSON.stringify(Array.from(set)));
        } catch {}
      }
    };
  }, [videos]);

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

  const displayedVideos = useMemo(() => {
    return filteredVideos.slice(0, page * 20);
  }, [filteredVideos, page]);

  const hasMore = displayedVideos.length < filteredVideos.length;

  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            setPage((prev) => prev + 1);
            setLoadingMore(false);
          }, 650);
        }
      },
      { threshold: 0.1, rootMargin: "120px" }
    );

    const el = observerRef.current;
    observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loading]);

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
    <PageShell
      className="w-full px-3 sm:px-5 md:px-8 xl:px-10 pt-20 sm:pt-24 max-w-[1920px] mx-auto pb-28 md:pb-16"
      title=""
      description=""
    >
      <div className="w-full space-y-6 select-none">
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
          {/* Back Button (Clean Icon-Only with Creative Elastic Recoil Spring & Glow) */}
          <button
            type="button"
            onClick={() => navigate({ to: "/treegallery" })}
            className="group relative size-9.5 sm:size-10 rounded-xl border border-border/70 bg-card/80 backdrop-blur-xs flex items-center justify-center text-foreground shadow-2xs hover:bg-secondary hover:border-border hover:shadow-xs active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Kembali ke TreeGallery"
            aria-label="Kembali ke TreeGallery"
          >
            {/* Subtle radial glow on hover */}
            <span className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200 pointer-events-none" />
            <span className="absolute -inset-px rounded-xl border border-primary/0 group-hover:border-primary/25 transition-colors duration-200 pointer-events-none" />

            {/* Creative Elastic Spring Recoil Arrow */}
            <ArrowLeft className="size-4.5 sm:size-5 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-1.5 group-hover:scale-115 group-hover:-rotate-6 active:-translate-x-2 active:scale-90 active:-rotate-12 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0" />
          </button>

          <div className="flex items-center gap-2">
            {/* Refresh Button (Clean Icon-Only with Elastic 180° Spring Spin & Glow) */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="group relative size-9.5 sm:size-10 rounded-xl border border-border/70 bg-card/80 backdrop-blur-xs flex items-center justify-center text-foreground shadow-2xs hover:bg-secondary hover:border-border hover:shadow-xs active:scale-95 transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Segarkan Seluruh Data Video"
              aria-label="Segarkan Seluruh Data Video"
            >
              {/* Subtle radial glow on hover */}
              <span className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200 pointer-events-none" />
              <span className="absolute -inset-px rounded-xl border border-primary/0 group-hover:border-primary/25 transition-colors duration-200 pointer-events-none" />

              {/* Elastic 180° Spin on Hover / Continuous Spin on Load */}
              <RotateCw className={`size-4 sm:size-4.5 text-muted-foreground group-hover:text-foreground transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0 ${
                loading ? "animate-spin text-primary" : "group-hover:rotate-180 group-hover:scale-115 active:rotate-[220deg] active:scale-90"
              }`} />
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
          <TreeSproutLoading message="Memuat seluruh galeri video..." />
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 sm:gap-4 items-start pt-3.5 pb-8">
              {displayedVideos.map((v) => {
                const yt = youtubeId(v.url);
                const isFeatured = featuredId === v.id;
                const isOwner = v.uid === uid;
                const isNew = v.status === "approved" && !seenApprovedIds.has(v.id);
                const hasComment = Boolean(
                  (v.status === "approved" && v.approvalComment) ||
                  (v.status === "rejected" && v.reason)
                );
                const hasUnreadComment = hasComment && !readComments[v.id];

                return (
                  <div
                    key={v.id}
                    className={`group relative flex flex-col ${
                      expandedCardId === v.id ? "z-20" : isOwner && isFeatured ? "z-10" : "z-0"
                    }`}
                  >
                    {/* Festive Ambient Party Glow Aura */}
                    <div
                      className={`pointer-events-none absolute -inset-1 rounded-2xl transition-all duration-500 ${
                        isOwner && isFeatured
                          ? "bg-gradient-to-br from-emerald-500/35 via-teal-400/25 via-amber-400/30 to-emerald-400/25 blur-md opacity-90 group-hover:opacity-100 group-hover:blur-lg"
                          : "bg-gradient-to-br from-emerald-500/15 via-teal-400/15 to-primary/15 blur-sm opacity-0 group-hover:opacity-75"
                      }`}
                    />

                    {/* Main Card Body */}
                    <div
                      className={`flex flex-col w-full overflow-hidden bg-card shadow-soft transition-[border-color,box-shadow] duration-200 ease-out border-2 ${
                        isOwner && isFeatured
                          ? "border-emerald-500/50 dark:border-emerald-400/60 shadow-[0_0_20px_-4px_rgba(16,185,129,0.25)]"
                          : "border-border/80 dark:border-border/70"
                      } ${
                        expandedCardId === v.id
                          ? "rounded-t-xl rounded-b-none border-b-0 shadow-lg"
                          : "rounded-xl hover:border-leaf dark:hover:border-primary hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.28)] dark:hover:shadow-[0_12px_32px_-8px_rgba(34,197,94,0.32)]"
                      }`}
                    >
                      {/* Thumbnail & Play Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          setPreview(v);
                        }}
                        className="relative aspect-video w-full overflow-hidden bg-secondary cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 select-none"
                      >
                        <VideoThumbnail video={v} yt={yt} />
                        
                        {/* Shimmer light sweep on hover */}
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                          <Play className="size-9 text-white drop-shadow-lg opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                        <SourceBadge source={v.sourceType} />

                        {/* Badge Tampil di Rumah Pohon (Animasi Lingkaran Hijau di Tengah Tanpa Teks) */}
                        {isOwner && isFeatured && (
                          <span
                            title="Sedang Tayang di Rumah Pohon"
                            className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 z-10 flex size-5.5 sm:size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-in fade-in"
                          >
                            <span className="relative flex items-center justify-center">
                              <span className="absolute size-3.5 rounded-full bg-emerald-400/50 animate-ping" />
                              <span className="relative size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-1.5 ring-emerald-500/30" />
                            </span>
                          </span>
                        )}
                      </button>

                      {/* Details */}
                      <div className="flex flex-1 flex-col p-3 pb-2">
                        <p className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground" title={v.title}>{v.title}</p>
                        
                        {/* Date & Toggle Row (Linear / Notion Interactive Timestamp) */}
                        <div className="mt-0.5 flex items-center justify-between gap-1.5 flex-wrap w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowActionTime(prev => ({ ...prev, [v.id]: !prev[v.id] }));
                            }}
                            title={showActionTime[v.id] ? "Klik untuk ganti ke Tanggal Diunggah" : "Klik untuk ganti ke Tanggal Disetujui"}
                            className="group/time inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 -ml-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all cursor-pointer active:scale-95"
                          >
                            <CurvedSwapIcon className="size-3 text-muted-foreground/70 group-hover/time:text-primary transition-transform duration-200 group-hover/time:scale-115 shrink-0" />
                            <span className="tabular-nums">
                              {showActionTime[v.id]
                                ? `Diunggah ${timeAgo(v.submittedAt)}`
                                : `Disetujui ${timeAgo(v.approvedAt || v.submittedAt)}`}
                            </span>
                          </button>
                          {isNew && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                              <Sparkles className="size-3" />
                              Baru
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t-2 border-border/80 dark:border-border/70">
                          {isOwner ? (
                            <button
                              onClick={() => toggleFeatured(v.id)}
                              className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer text-center ${
                                isFeatured
                                  ? "border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                  : "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70"
                              }`}
                            >
                              {isFeatured ? "Stop Showing" : "Set as Show"}
                            </button>
                          ) : (
                            <button
                              onClick={() => setPreview(v)}
                              className="flex-1 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer text-center border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70"
                            >
                              Tonton Video
                            </button>
                          )}

                          {/* Tombol Pengaturan (Settings Gear) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCardId(expandedCardId === v.id ? null : v.id);
                            }}
                            title={expandedCardId === v.id ? "Tutup Pengaturan" : "Buka Pengaturan"}
                            className={`relative rounded-lg p-1.5 transition-colors cursor-pointer shrink-0 ${
                              expandedCardId === v.id 
                                ? 'bg-primary/15 text-primary' 
                                : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            <Settings className={`size-4 transition-transform duration-200 ${expandedCardId === v.id ? 'rotate-90' : ''}`} />
                            {hasUnreadComment && (
                              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Overlapping Extension Menu ("Ditabrak" di atas elemen bawah) */}
                    <AnimatePresence>
                      {expandedCardId === v.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className={`absolute left-0 right-0 top-full z-20 rounded-b-xl border-2 border-t-0 bg-card p-2 pt-1.5 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.6)] ${
                            isOwner && isFeatured
                              ? "border-emerald-500/50 dark:border-emerald-400/60"
                              : "border-border/80 dark:border-border/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            {/* 1. Icon Info Video */}
                            <button
                              type="button"
                              onClick={() => {
                                setInfoVideo(v);
                                setExpandedCardId(null);
                              }}
                              title="Informasi Detail"
                              className="flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            >
                              <Info className="size-4" />
                            </button>

                            {/* 2. Icon Catatan Admin */}
                            <button
                              type="button"
                              onClick={() => {
                                setViewCommentVideo(v);
                                markCommentAsRead(v.id);
                                setExpandedCardId(null);
                              }}
                              title="Catatan Admin"
                              className="relative flex flex-1 items-center justify-center rounded-lg border border-border/80 bg-secondary/80 py-1.5 text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            >
                              <MessageSquare className="size-4" />
                              {hasUnreadComment && (
                                <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                              )}
                            </button>

                            {/* 3. Icon Hapus Video (Khusus Pemilik) */}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTargetVideo(v);
                                  setExpandedCardId(null);
                                }}
                                title="Hapus Video"
                                className="flex flex-1 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 py-1.5 text-destructive hover:bg-destructive/20 dark:border-destructive/40 dark:bg-destructive/15 transition-colors cursor-pointer"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll Sentinel & Loading Indicator */}
            <div ref={observerRef} className="w-full flex justify-center py-4">
              {loadingMore && (
                <TreeSproutLoading message="Memuat 20 video berikutnya..." />
              )}
            </div>
          </div>
        )}

        {/* ── MODAL PLAYER VIDEO ── */}
        {preview && (
          <VideoPlayerModal video={preview} onClose={() => setPreview(null)} />
        )}

        {/* ── MODAL DETAIL INFORMASI VIDEO ── */}
        {infoVideo && (
          <div
            onClick={() => setInfoVideo(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-float animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center gap-3 mb-4 border-b border-border/60 pb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                  <Info className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Informasi Video</h3>
                  <p className="text-[11px] font-medium text-muted-foreground">Detail pengajuan video</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Judul Video</p>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{infoVideo.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
                    <p className={`text-xs font-bold ${
                      infoVideo.status === 'approved' ? 'text-emerald-600' :
                      infoVideo.status === 'rejected' ? 'text-destructive' :
                      infoVideo.status === 'cancelled' ? 'text-muted-foreground' : 'text-amber-500'
                    }`}>
                      {infoVideo.status === 'approved' ? 'Disetujui' :
                       infoVideo.status === 'rejected' ? 'Ditolak' :
                       infoVideo.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu Moderasi'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Sumber</p>
                    <p className="text-xs font-semibold text-foreground capitalize">{infoVideo.sourceType}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Waktu Diunggah</p>
                  <p className="text-xs font-medium text-foreground">
                    {new Date(infoVideo.submittedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {infoVideo.status !== 'pending' && infoVideo.status !== 'cancelled' && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Waktu Tindakan Admin</p>
                    <p className="text-xs font-medium text-foreground">
                      {infoVideo.status === 'approved' && infoVideo.approvedAt ? 
                        new Date(infoVideo.approvedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
                       infoVideo.status === 'rejected' && infoVideo.rejectedAt ? 
                        new Date(infoVideo.rejectedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 
                        '-'
                      }
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setInfoVideo(null)}
                className="w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/70 cursor-pointer shadow-soft active:scale-95 border border-border/60"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL VIEW COMMENT ADMIN ── */}
        {viewCommentVideo && (
          <div
            onClick={() => setViewCommentVideo(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg sm:max-w-xl overflow-hidden rounded-xl border border-border/80 bg-card p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
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
              className="w-full max-w-md rounded-3xl border border-border/80 bg-card text-card-foreground p-6 shadow-float text-center space-y-4 animate-in zoom-in-95 duration-150"
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
                  Hapus
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
      fetchTikTokThumbnail(video.url).then((thumbUrl: string | null) => {
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
        src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`}
        alt={video.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="size-full object-cover"
      />
    );
  }

  if (tiktokThumb) {
    return (
      <img
        src={tiktokThumb}
        alt={video.title}
        referrerPolicy="no-referrer"
        loading="lazy"
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

// SourceBadge is for thumbnail overlays; VideoPlayerModal is now the shared component.
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

function CurvedSwapIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top arrow: gentle curve up from left to right with ample vertical breathing room */}
      <path d="M4 11a4 4 0 0 1 4-4h12" />
      <path d="m16.5 3.5 3.5 3.5-3.5 3.5" />
      {/* Bottom arrow: gentle curve down from right to left with exact symmetrical spacing */}
      <path d="M20 13a4 4 0 0 1-4 4H4" />
      <path d="m7.5 13.5-3.5 3.5 3.5 3.5" />
    </svg>
  );
}

function TreeSproutLoading({ message = "Menyiapkan video..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 sm:py-24 select-none"
    >
      {/* Minimalist Nature/Sprout Living Icon */}
      <div className="relative flex items-center justify-center size-20">
        {/* Soft Ambient Radial Halo Glow */}
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.2, 0.45, 0.2],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute size-16 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/20"
        />

        {/* Minimalist Tree Sprout SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative size-12 drop-shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
        >
          {/* Ground Soil Arc / Ripple */}
          <motion.path
            d="M12 42C18 40.5 30 40.5 36 42"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-emerald-500/30 dark:text-emerald-400/30"
            animate={{
              opacity: [0.25, 0.65, 0.25],
              scaleX: [0.94, 1.06, 0.94],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "24px 42px" }}
          />

          {/* Animated Sprout Plant Group (Gentle organic breeze sway) */}
          <motion.g
            animate={{
              rotate: [-3.5, 3.5, -3.5],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "24px 41px" }}
          >
            {/* Sprout Main Stem */}
            <path
              d="M24 41V22C24 16.5 26.5 12.5 29 9"
              stroke="url(#sprout-stem-grad-all)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Left Leaf Petal */}
            <motion.path
              d="M24 25C15 25 12 18 13 12C20 12 24 18 24 25Z"
              fill="url(#sprout-leaf-left-all)"
              animate={{
                rotate: [-6, 6, -6],
                scale: [0.94, 1.06, 0.94],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "24px 25px" }}
            />

            {/* Right Leaf Petal (Top Bud) */}
            <motion.path
              d="M24 17C33 16 36 9 34 3C27 4 24 10 24 17Z"
              fill="url(#sprout-leaf-right-all)"
              animate={{
                rotate: [6, -6, 6],
                scale: [1.06, 0.94, 1.06],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "24px 17px" }}
            />
          </motion.g>

          {/* Gradients */}
          <defs>
            <linearGradient id="sprout-stem-grad-all" x1="24" y1="41" x2="24" y2="9" gradientUnits="userSpaceOnUse">
              <stop stopColor="#059669" />
              <stop offset="1" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="sprout-leaf-left-all" x1="12" y1="12" x2="24" y2="25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="sprout-leaf-right-all" x1="24" y1="3" x2="36" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Dew / Growth Micro-particles (Smooth seamless loop) */}
        {[
          { x: -14, y: -6, duration: 2.2, delay: 0 },
          { x: 16, y: -12, duration: 2.6, delay: 0.8 },
          { x: 0, y: -18, duration: 2.4, delay: 1.4 },
        ].map((pt, idx) => (
          <motion.span
            key={idx}
            className="absolute size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] dark:bg-emerald-300 pointer-events-none"
            style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(50% + ${pt.y}px)` }}
            animate={{
              y: [0, -12, -24],
              opacity: [0, 0.9, 0],
              scale: [0.5, 1.15, 0.4],
            }}
            transition={{
              duration: pt.duration,
              repeat: Infinity,
              delay: pt.delay,
              ease: "easeInOut",
              times: [0, 0.5, 1],
            }}
          />
        ))}
      </div>

      {/* Modern, calm typography */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-3 text-xs font-medium tracking-wide text-muted-foreground/80 dark:text-muted-foreground/70"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

